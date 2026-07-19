/* Drafts a formal, email-style meeting-request message grounded in both
 * parties' profiles — used by the "Request meeting" modal's AI-suggest button. */
const pool = require('../../config/db');
const { client, hasKey, CHAT_MODEL } = require('../../config/openai');
const messageDraftSchema = require('./schemas/messageDraft.schema');
const { trackedCompletion } = require('./usage.service');

const SYSTEM_PROMPT = `You draft a short, formal, professional meeting-request message for VietNexus, a startup-investor matchmaking platform — written the way a well-considered introduction email would read.
Rules:
- Ground every claim ONLY in the SENDER and RECIPIENT data given below. Never invent facts, numbers, or history.
- Reference 1-2 SPECIFIC, concrete points of alignment (sector, stage, check size vs funding ask, thesis vs product, traction) drawn from the data.
- State clearly what the sender is requesting (a short introductory call) and briefly what it could offer the recipient.
- Formal, concise, professional register — like a considered cold email, not chatty or casual. No exclamation marks, no emoji, no marketing language.
- 90-140 words. Sign off with the sender's name (and company/firm if present).
- Output plain text only: no subject line, no markdown, no bracketed placeholders.`;

async function loadParty(userId) {
  const { rows } = await pool.query(
    `SELECT u.full_name, p.role, p.display_name, p.headline, p.country, p.sectors, p.regions,
            p.stage, p.stages, p.investor_type, p.check_size_min_usd, p.check_size_max_usd,
            p.funding_ask_usd, p.arr_usd, p.business_model, p.details,
            ep.attributes AS extracted_attributes
     FROM users u
     JOIN profiles p ON p.user_id = u.id
     LEFT JOIN extracted_profiles ep ON ep.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );
  return rows[0] || null;
}

function summarize(party) {
  const a = party.extracted_attributes || {};
  const d = party.details || {};
  if (party.role === 'founder') {
    return {
      role: 'founder', name: party.full_name, company: party.display_name, headline: party.headline,
      country: party.country, sectors: party.sectors, stage: party.stage,
      business_model: party.business_model,
      product_description: a.product_description || d.productDescription || null,
      traction_summary: a.traction_summary || d.traction || null,
      funding_ask_usd: party.funding_ask_usd, arr_usd: party.arr_usd,
      looking_for: a.looking_for || d.lookingFor || [],
    };
  }
  return {
    role: 'investor', name: party.full_name, firm: party.display_name, headline: party.headline,
    country: party.country, sectors: party.sectors, stages: party.stages, investor_type: party.investor_type,
    check_size_min_usd: party.check_size_min_usd, check_size_max_usd: party.check_size_max_usd,
    thesis: a.thesis || d.thesis || null,
  };
}

// Keyless fallback: a plain formal template with no invented specifics.
function fallbackMessage(sender, recipient) {
  const senderName = sender.full_name || sender.display_name;
  const senderOrg = sender.display_name && sender.display_name !== senderName ? ` of ${sender.display_name}` : '';
  const recipientName = recipient.display_name || recipient.full_name;
  return `Dear ${recipientName} team,

My name is ${senderName}${senderOrg}. I came across your profile on VietNexus and would welcome the opportunity to connect.

I believe there may be strong alignment worth exploring further, and would appreciate a short introductory call at your convenience to discuss potential collaboration.

Best regards,
${senderName}`;
}

async function draftMeetingMessage(requesterUserId, recipientUserId) {
  const [sender, recipient] = await Promise.all([loadParty(requesterUserId), loadParty(recipientUserId)]);
  if (!sender || !recipient) {
    const err = new Error('Profile not found');
    err.status = 404;
    throw err;
  }

  if (!hasKey) return { message: fallbackMessage(sender, recipient) };

  const completion = await trackedCompletion(client, {
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `SENDER:\n${JSON.stringify(summarize(sender), null, 2)}\n\nRECIPIENT:\n${JSON.stringify(summarize(recipient), null, 2)}`,
      },
    ],
    response_format: { type: 'json_schema', json_schema: messageDraftSchema },
  }, { userId: requesterUserId, feature: 'message_draft' });

  const data = JSON.parse(completion.choices[0].message.content);
  return { message: data.message };
}

module.exports = { draftMeetingMessage };
