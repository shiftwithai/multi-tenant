import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get pending notifications that are due to be sent
    const { data: notifications, error } = await supabase
      .from('sms_notifications')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(50);

    if (error) throw error;

    if (!notifications || notifications.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No pending notifications',
          processed: 0,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Process each notification
    const results = [];
    for (const notification of notifications) {
      try {
        // Call send-sms-notification function
        const response = await fetch(
          `${supabaseUrl}/functions/v1/send-sms-notification`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              to: notification.recipient_phone,
              message: notification.message_body,
              notificationId: notification.id,
            }),
          }
        );

        const result = await response.json();
        results.push({
          id: notification.id,
          success: result.success,
          error: result.error || null,
        });
      } catch (err) {
        console.error(`Failed to process notification ${notification.id}:`, err);
        results.push({
          id: notification.id,
          success: false,
          error: err.message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${notifications.length} notifications`,
        processed: notifications.length,
        sent: successCount,
        failed: failCount,
        results,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error processing SMS queue:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to process SMS queue',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});