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

    // Split name into first and last if possible
    const nameParts = name ? name.trim().split(' ') : [''];
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    // Prepare ActiveCampaign Payload
    // Note: We'll attempt to sync the contact. 
    // Custom fields for area/graduation/UTMs should be configured in AC.
    // We send them as fieldValues if we had IDs, but for now we'll send a generic update.
    
    // For UTMs, we'll try to map them to fieldValues if we can find common patterns, 
    // or just store them in a way the user can use.
    // PRO TIP: To map custom fields, the user usually needs the field IDs.
    // For now, we'll focus on the core contact data.

    const contactPayload = {
      contact: {
        email,
        firstName,
        lastName,
        phone,
        // We can add fieldValues here if we have the IDs (e.g., { field: "1", value: "value" })
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
