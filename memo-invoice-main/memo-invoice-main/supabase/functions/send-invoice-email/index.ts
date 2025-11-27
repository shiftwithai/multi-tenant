import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface EmailRequest {
  invoiceId: string;
  pdfBase64: string;
  overrideEmail?: string;
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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const brevoSmtpKey = Deno.env.get('BREVO_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { invoiceId, pdfBase64, overrideEmail }: EmailRequest = await req.json();

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*, customers(*)')
      .eq('id', invoiceId)
      .maybeSingle();

    if (invoiceError || !invoice) {
      throw new Error('Invoice not found');
    }

    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId);

    if (itemsError) {
      throw new Error('Failed to fetch invoice items');
    }

    const customer = invoice.customers;
    const recipientEmail = overrideEmail || customer?.email;
    const recipientName = customer?.name || 'Customer';

    if (!recipientEmail) {
      throw new Error('No recipient email provided');
    }

    const emailBodyHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;">
      <p>Hi,</p>

<p>Thank you for your business. This is regarding Invoice ${invoice.invoice_number} dated ${new Date(invoice.created_at).toLocaleDateString()} for $${invoice.total.toFixed(2)}.</p>

      <p>Your invoice is attached for your records.</p>

      <p>Thank you for your business!</p>

      <p style="margin-top: 24px;">
        <strong>Mr. Memo Auto</strong><br>
        (647) 501-6039<br>
        800 Arrow Rd, Unit 1<br>
        North York, ON M9M 2Z8
      </p>
    </body>
    </html>
    `;

    const emailData = {
      sender: {
        name: 'Mr. Memo Auto',
        email: 'bookings.mrmemo@gmail.com',
      },
      to: [
        {
          email: recipientEmail,
          name: recipientName,
        },
      ],
      subject: `Invoice #${invoice.invoice_number} from Mr. Memo Auto`,
      htmlContent: emailBodyHtml,
      attachment: [
        {
          name: `Invoice-${invoice.invoice_number}.pdf`,
          content: pdfBase64,
        },
      ],
    };

    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoSmtpKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    if (!brevoResponse.ok) {
      const errorText = await brevoResponse.text();
      throw new Error(`Brevo API error: ${errorText}`);
    }

    const result = await brevoResponse.json();

    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});