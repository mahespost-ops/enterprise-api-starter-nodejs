// Simple test script to debug webhook creation
require('dotenv').config();

async function test() {
  const { Webhook, Environment, Organization, sequelize } = require('./src/models');

  try {
    // Create test org
    const org = await Organization.create({
      name: 'Test Org',
      slug: 'test-org-' + Date.now(),
      isActive: true,
    });

    // Create test environment
    const env = await Environment.create({
      organizationId: org.id,
      name: 'Test Env',
      type: 'sandbox',
      isActive: true,
      isDefault: false,
    });

    console.log('Created environment:', env.id);

    // Try to create a webhook
    const webhook = await Webhook.create({
      environmentId: env.id,
      name: 'Test Webhook',
      url: 'https://example.com/webhook',
      eventTypes: ['user.login'],
      authMethod: 'hmac',
      authConfig: { secret: 'test' },
      retryConfig: {
        maxAttempts: 3,
        backoffMultiplier: 2.0,
        maxBackoffSeconds: 3600,
      },
      isActive: true,
    });

    console.log('SUCCESS! Created webhook:', webhook.id);

    // Cleanup
    await webhook.destroy({ force: true });
    await env.destroy({ force: true });
    await org.destroy({ force: true });

  } catch (error) {
    console.error('ERROR:', error.message);
    console.error('DETAILS:', error.original?.message || 'No original error');
    console.error('SQL:', error.sql || 'No SQL');
  } finally {
    const { sequelize } = require('./src/models');
    await sequelize.close();
  }
}

test();
