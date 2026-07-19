const messageDraftSchema = {
  name: 'meeting_message_draft',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      message: { type: 'string' },
    },
    required: ['message'],
  },
};

module.exports = messageDraftSchema;
