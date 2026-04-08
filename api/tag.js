/**
 * Serverless function to add a tag to a contact in ActiveCampaign
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
    const { contactId, tagName } = req.body;

    if (!contactId || !tagName) {
      return res.status(400).json({ error: 'Missing contactId or tagName' });
    }

    // 1. Find the Tag ID by name
    const tagSearchUrl = `${API_URL_ACTIVE}/api/3/tags?search=${encodeURIComponent(tagName)}`;
    const searchResponse = await fetch(tagSearchUrl, {
      method: 'GET',
      headers: { 'Api-Token': API_KEY_ACTIVE }
    });

    const searchData = await searchResponse.json();
    let tagId = null;

    if (searchData.tags && searchData.tags.length > 0) {
      // Find exact match if multiple returned
      const exactTag = searchData.tags.find(t => t.tag === tagName);
      if (exactTag) tagId = exactTag.id;
    }

    // 2. If tag doesn't exist, create it (optional, but safer)
    if (!tagId) {
      const createResponse = await fetch(`${API_URL_ACTIVE}/api/3/tags`, {
        method: 'POST',
        headers: {
          'Api-Token': API_KEY_ACTIVE,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tag: { tag: tagName, tagType: 'contact' } })
      });
      const createData = await createResponse.json();
      if (createData.tag) tagId = createData.tag.id;
    }

    if (!tagId) {
      throw new Error(`Could not find or create tag: ${tagName}`);
    }

    // 3. Add tag to contact
    const tagAddResponse = await fetch(`${API_URL_ACTIVE}/api/3/contactTags`, {
      method: 'POST',
      headers: {
        'Api-Token': API_KEY_ACTIVE,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contactTag: {
          contact: contactId,
          tag: tagId
        }
      })
    });

    if (!tagAddResponse.ok) {
      const tagAddData = await tagAddResponse.json();
      throw new Error(tagAddData.message || 'Error adding tag to contact');
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('ActiveCampaign Tagging Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
