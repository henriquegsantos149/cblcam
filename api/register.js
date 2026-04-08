/**
 * Serverless function to register a lead in ActiveCampaign
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { API_URL_ACTIVE, API_KEY_ACTIVE } = process.env;

  if (!API_URL_ACTIVE || !API_KEY_ACTIVE) {
    return res.status(500).json({ error: 'Missing ActiveCampaign API configuration' });
  }

  try {
    const { name, email, phone, area, graduacao, utms } = req.body;

    console.log('--- Novo Registro Recebido ---');
    console.log('Dados:', { name, email, phone, area, graduacao });
    console.log('UTMs capturados:', utms);

    // Split name into first and last if possible
    const nameParts = name ? name.trim().split(' ') : [''];
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    // Prepare Custom Fields (fieldValues) using IDs found in ActiveCampaign
    const fieldValues = [];

    if (area) fieldValues.push({ field: '250', value: area });
    if (graduacao) fieldValues.push({ field: '249', value: graduacao });

    // Mapping UTMs to fieldValues (using [L07] [POS] [GEOPROCESSAMENTO] fields)
    if (utms) {
      if (utms.CBLCAM_UTM_SOURCE) fieldValues.push({ field: '245', value: utms.CBLCAM_UTM_SOURCE });
      if (utms.CBLCAM_UTM_MEDIUM) fieldValues.push({ field: '246', value: utms.CBLCAM_UTM_MEDIUM });
      if (utms.CBLCAM_UTM_CAMPAIGN) fieldValues.push({ field: '244', value: utms.CBLCAM_UTM_CAMPAIGN });
      if (utms.CBLCAM_UTM_TERM) fieldValues.push({ field: '247', value: utms.CBLCAM_UTM_TERM });
      if (utms.CBLCAM_UTM_CONTENT) fieldValues.push({ field: '251', value: utms.CBLCAM_UTM_CONTENT });
    }

    // Add registration date
    const now = new Date();
    const formattedDate = now.toLocaleDateString('pt-BR');
    fieldValues.push({ field: '248', value: formattedDate });

    const contactPayload = {
      contact: {
        email,
        firstName,
        lastName,
        phone,
        fieldValues
      }
    };

    const response = await fetch(`${API_URL_ACTIVE}/api/3/contact/sync`, {
      method: 'POST',
      headers: {
        'Api-Token': API_KEY_ACTIVE,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contactPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error syncing contact');
    }

    // Return the contact ID so the frontend can use it for tagging later
    return res.status(200).json({ 
      success: true, 
      contactId: data.contact.id,
      email: data.contact.email 
    });

  } catch (error) {
    console.error('ActiveCampaign Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
