import axios from 'axios';

type PayUToken = {
  access_token: string;
};

export async function getPayuToken() {
  if (!process.env.PAYU_CLIENT_ID || !process.env.PAYU_CLIENT_SECRET) {
    throw new Error('Missing PayU credentials');
  }

  const authBase = process.env.PAYU_AUTH_URL ?? 'https://secure.snd.payu.com/pl/standard/user/oauth/authorize';

  const response = await axios.post<PayUToken>(
    authBase,
    new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.PAYU_CLIENT_ID,
      client_secret: process.env.PAYU_CLIENT_SECRET
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  return response.data.access_token;
}

type CreateOrderInput = {
  amount: number;
  currency: string;
  description: string;
  extOrderId: string;
  buyerEmail?: string;
  continueUrl: string;
};

export async function createPayuOrder(input: CreateOrderInput) {
  const token = await getPayuToken();
  const apiBase = process.env.PAYU_API_URL ?? 'https://secure.snd.payu.com/api/v2_1/orders';

  const payload = {
    notifyUrl: `${process.env.APP_URL}/api/webhooks/payu`,
    customerIp: '127.0.0.1',
    merchantPosId: process.env.PAYU_CLIENT_ID,
    description: input.description,
    currencyCode: input.currency,
    totalAmount: String(input.amount),
    extOrderId: input.extOrderId,
    continueUrl: input.continueUrl,
    buyer: {
      email: input.buyerEmail ?? 'guest@virtualcandle.com'
    },
    products: [
      {
        name: input.description,
        unitPrice: String(input.amount),
        quantity: '1'
      }
    ]
  };

  const response = await axios.post(apiBase, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    maxRedirects: 0,
    validateStatus: (status) => status >= 200 && status < 400
  });

  return response.data as { redirectUri?: string; orderId?: string; status?: { statusCode: string } };
}
