export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const {
    name,
    email,
    phone,
    telefone,
    graduacao,
    graduation,
    utm_campaign,
    utm_source,
    utm_medium,
    utm_content,
    utm_term
  } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const apiKey = process.env.ACTIVE_API_KEY || process.env.API_KEY_ACTIVE;
  if (!apiKey) {
    console.error('ACTIVE_API_KEY não configurada no ambiente.');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const AC_BASE_URL = 'https://ambientalpro.api-us1.com/api/3';
  const headers = {
    'Api-Token': apiKey,
    'Content-Type': 'application/json'
  };

  const contactPhone = phone || telefone || '';
  const contactGraduacao = graduacao || graduation || '';

  // Split name if possible
  const nameParts = name ? name.trim().split(' ') : [''];
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

  try {
    // 1. Sync Contact with standard and custom fields
    const syncData = {
      contact: {
        email: email.trim().toLowerCase(),
        firstName: firstName,
        lastName: lastName,
        phone: contactPhone,
        fieldValues: [
          { field: '880', value: utm_campaign || '' },
          { field: '881', value: utm_source || '' },
          { field: '882', value: utm_medium || '' },
          { field: '883', value: utm_content || '' },
          { field: '884', value: utm_term || '' },
          { field: '885', value: contactGraduacao || '' },
          { field: '887', value: new Date().toISOString() }
        ]
      }
    };

    const syncRes = await fetch(`${AC_BASE_URL}/contact/sync`, {
      method: 'POST',
      headers,
      body: JSON.stringify(syncData)
    });

    const syncJson = await syncRes.json();

    if (!syncRes.ok) {
      console.error('ActiveCampaign Sync Error:', syncJson);
      return res.status(400).json({ error: 'Failed to sync contact', details: syncJson });
    }

    const contactId = syncJson.contact.id;

    // 2. Add Tag: [C3][CBLCAM] Lead (Tag ID: 480)
    const tagData = {
      contactTag: {
        contact: contactId,
        tag: '480'
      }
    };

    const tagRes = await fetch(`${AC_BASE_URL}/contactTags`, {
      method: 'POST',
      headers,
      body: JSON.stringify(tagData)
    });

    const tagJson = await tagRes.json();
    if (!tagRes.ok) {
      console.error('ActiveCampaign Tag Error:', tagJson);
    }

    return res.status(200).json({ success: true, contactId });

  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
