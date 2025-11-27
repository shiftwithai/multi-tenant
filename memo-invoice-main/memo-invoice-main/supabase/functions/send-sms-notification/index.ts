import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SMSRequest {
  to: string;
  message: string;
  notificationId?: string;
}

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
    const n8nWebhookUrl = 'https://n8n.shiftwith.ai/webhook/send-sms';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { to, message, notificationId }: SMSRequest = await req.json();

    // Format phone number to E.164
    let formattedPhone = to.replace(/[^0-9+]/g, '');
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.length === 10) {
        formattedPhone = '+1' + formattedPhone;
      } else if (formattedPhone.length === 11 && formattedPhone.startsWith('1')) {
        formattedPhone = '+' + formattedPhone;
      }
    }

    // Send SMS via n8n webhook
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notification_id: notificationId,
        recipient_phone: formattedPhone,
        message_body: message,
        notification_type: 'manual',
      }),
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error('n8n webhook error:', errorText);

      if (notificationId) {
        await supabase
          .from('sms_notifications')
          .update({
            status: 'failed',
            error_message: `n8n webhook failed: ${errorText}`,
          })
          .eq('id', notificationId);
      }

      throw new Error(`n8n webhook failed: ${errorText}`);
    }

    const n8nData = await n8nResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'SMS queued for sending via n8n',
        data: n8nData,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error sending SMS:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to send SMS',
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