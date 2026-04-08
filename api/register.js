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

    // Prepare Custom Fields (fieldValues)
    // IMPORTANT: Replace the 'ID' values below with the real IDs from your ActiveCampaign account.
    // Use numeric IDs (e.g., "1", "2").
    const fieldValues = [];

    if (area) fieldValues.push({ field: 'ID_AREA_FORMACAO', value: area });
    if (graduacao) fieldValues.push({ field: 'ID_GRADUACAO', value: graduacao });

    // Mapping UTMs to fieldValues
    if (utms) {
      if (utms.CBLCAM_UTM_SOURCE) fieldValues.push({ field: 'ID_UTM_SOURCE', value: utms.CBLCAM_UTM_SOURCE });
      if (utms.CBLCAM_UTM_MEDIUM) fieldValues.push({ field: 'ID_UTM_MEDIUM', value: utms.CBLCAM_UTM_MEDIUM });
      if (utms.CBLCAM_UTM_CAMPAIGN) fieldValues.push({ field: 'ID_UTM_CAMPAIGN', value: utms.CBLCAM_UTM_CAMPAIGN });
      if (utms.CBLCAM_UTM_TERM) fieldValues.push({ field: 'ID_UTM_TERM', value: utms.CBLCAM_UTM_TERM });
      if (utms.CBLCAM_UTM_CONTENT) fieldValues.push({ field: 'ID_UTM_CONTENT', value: utms.CBLCAM_UTM_CONTENT });
    }

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
