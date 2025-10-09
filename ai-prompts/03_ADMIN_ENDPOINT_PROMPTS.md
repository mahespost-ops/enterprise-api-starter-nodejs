# Admin Endpoint Prompts

This document contains the prompts used to implement system-wide admin endpoints, event logging, webhooks, and associated infrastructure following TDD principles and separation of concerns.

## Summary

- Admin-scoped endpoints for users, organizations, environments, groups, members, devices, sessions
- Role and permission management (RBAC)
- Role assignments for groups and members
- Impersonation management (system-wide)
- Event type configuration and event logging
- Webhook management with delivery tracking and retry mechanisms
- Event logger middleware with CloudEvents 1.0.2 standard
- Separation of concerns enforcement (Models handle all database operations)
- Constants usage for type/status fields (no magic strings)

---

## Admin Endpoint Structure & Permissions

> Review our test progress tracker document and let's proceed with the next chunk. I believe we're starting on admin endpoints now. Feel free to ask me any clarifying questions along the way.

> 1. Smaller batches to allow us to incrementally clear context and minimize hallucination risk.
> 2. Check the responses documented in api-docs, and implemented in code, and determine which tests are required for which endpoints respectively; they may vary.
> 3. The best practice is likely just respecting the respective permissions per endpoint, because we can define roles with those permissions and those become System Admin or Support. The global system:admin and system:support I'm undecided on whether needed actually but open to suggestions.
> 4. Although reuse would be great, let's adhere to separation of concern principles and create separate admin-scoped services. the models, however, should be reusable and if any admin-specific functionality is needed, don't write database logic in services, create it in the models for clear layer separate and expose functions to the service layer as needed.
> 5. yes that is a good starting point.

> When creating these files remember to factor out magic strings to constants files. This includes types and statuses, and other filter fields, etc.

> fix the api docs and admin endpoints to be consistent with the user endpoints and actual database fields.

> Review how test JWTs are created in other tests and copy pattern for consistency. If that is the JWT the api will return, we should simulate the same in our tests.

> update progress tracker and we will reset context before next batch of endpoints

---

## Admin Users, Organizations, Environments

> let's continue with the next batch of admin endpoints as noted in our tests progress tracker file. remember to use constants and not magic strings and follow prior patterns

---

## Separation of Concerns Enforcement

> The two recent admin endpoint implementations have violated the separation of concerns and imported sequelize Op into the service layer. These are not imported in any tenant services and ALL DATABASE INTERACTION MUST REMAIN IN MODEL LAYER ONLY. Remove them and expose only static functions as needed from models to address. Please also analyze the admin service file compositions and constants and compare to some previous tenant endpoint services and constants and identify where the admin endpoint implementation diverged and fix them to follow established patterns. ALWAYS ADHERE TO DRY AND SOC standards.

> For posterity's sake, please analyze all the services files (tenant and admin) and double check that they adhere to the STANDARDS.md file in that directory. Identify any detractors and reasons with evidence.

> NEVER IMPORT sequelize into a services file EVER! Only expose static methods from Model layer. Factor this logic out and use functions to adhere to separation of concern rules. Make sure your context file is accurate and guarantees you don't violate these rule any more.

> replace the Op import atop the Model file. that is where it belongs and not accessible by Services files. keep imports in the same place for consistency and don't import them within a method

---

## Admin Groups & Members

> review the progress tracker for admin implementation and proceed with next batch

> NEVER import Op and sequelize into the services layer. Only expose static methods from models. Only models interact with database. Update your CLAUDE.md file as necessary to prevent this from repeating.

> review the progress tracker for admin implementation and proceed with next batch. prior to creating files review STANDARDS.md files and CLAUDE.md and at least one endpoint prior example to adhere to no magic strings, DRY, and SOC standards. Model layer is the only layer interacting with the database so expose static filter functions as necessary for services to use.

> follow TDD best practices. write red phase tests first. then focus on implementation to get to green phase.

---

## Admin Devices & Sessions

> review the progress tracker for admin implementation and proceed with next batch. prior to creating files review STANDARDS.md files and CLAUDE.md and at least one endpoint prior example to adhere to no magic strings, DRY, and SOC standards. Model layer is the only layer interacting with the database so expose static filter functions as necessary for services to use. follow TDD best practices. write red phase tests first. then focus on implementation to get to green phase.

> lint and typecheck

---

## Admin Roles & Permissions

> NEVER import sequelize into a service layer file. Models should only interact with database and expose static methods as necessary for service layer usage.

> Review how tenant organization tests are working for clues on how to fix these ones and proceed with getting to green phase

> Do we test that in other tests and if so, how do we handle the clean up?

> Your code is getting sloppy. This is unacceptable so ensure the message is consistent with other messages in our other models and we don't detract from standard patterns. const error = new Error('ROLE_PERMISSION_EXISTS'); const error = new Error('ROLE_PERMISSION_NOT_FOUND'); If you are going to use constants, use them but don't just write all caps strings. Otherwise just write normal error messages. Review other Model files and compare so you adhere to similar patterns for consistency throughout the application.

> You're breaking our best practice of no magic strings. you should NEVER compare on a magic string. If there is dependency between layers, then use constants ALWAYS. Review the relationship between other service -> model in other endpoints because this is not standard. Fix it and be consistent.

---

## Admin Role Assignments

> review the progress tracker for admin implementation and proceed with next batch. prior to creating files review STANDARDS.md files and CLAUDE.md and at least one endpoint prior example to adhere to no magic strings, DRY, and SOC standards. Model layer is the only layer interacting with the database so expose static filter functions as necessary for services to use. follow TDD best practices. write red phase tests first. then focus on implementation to get to green phase.

> is the admin progress tracker file updated

---

## Admin Impersonation Management

> review the progress tracker for admin implementation and proceed with next batch. prior to creating files review STANDARDS.md files and CLAUDE.md and at least one endpoint prior example to adhere to no magic strings, DRY, and SOC standards. Model layer is the only layer interacting with the database so expose static filter functions as necessary for services to use. follow TDD best practices. write red phase tests first. then focus on implementation to get to green phase.

> review the progress tracker for admin implementation and proceed with next batch. prior to creating files review STANDARDS.md files and CLAUDE.md and at least one endpoint prior example to adhere to no magic strings, DRY, and SOC standards. Model layer is the only layer interacting with the database so expose static filter functions as necessary for services to use. follow TDD best practices. write red phase tests first. then focus on implementation to get to green phase.

> don't leave incomplete implementation. Update the model and add static methods for filtering and complete the functionality. I expect no TODO statements in this batch

> Review and fix the tests to get us green, then verify code quality with linter and typecheck, then update progress tracker when all fixed

> if needed, check other test implementations from other endpoints to identify working patterns

> Check other tests to see how they solved this

> linter and typecheck, then update progress tracker

---

## Event Types & Event Logging Infrastructure

> We recently completed 2 admin/events endpoints and updated the admin implementation progress tracker document. We do need to add CRUD endpoints (admin only) for event_type, however. I would like to first define the specification in api-docs/. Review how we defined the /admin/devices as an example and add the /admin/event-types CRUD endpoints (based on schema definition in migrations/ and the database if needed) and follow our existing patterns. Since there are only 2 endpoints in Admin - Events tag group in the OAPI spec, add these new endpoints within that group and do not create a new tag group.

---

## Webhook Infrastructure & Event Type Subscriptions

> Prior to implementing webhooks we need a reverse-lookup table to facilitate deliveries. Since webhook can subscribe to one or more event_type (verbs), when we create a webhook we also want to populate a reverse lookup table called event_type_subscription. This table will have its own id, and then reference the event_type_id, event_type_verb, webhook_id, webhook_name, webhook_url, webhook_auth_method, webhook_auth_config, webhook_retry_config, webhook_metadata, is_active, created_at, updated_at. Add this table with standard indexes, constraints, triggers to remain consistent with our other schema tables, and then add GET endpoints to the spec doc for /admin/event-type-subscriptions that filters on either event_type_id, event_type_verb, webhook_id, webhook_name, webhook_url. We only need the GET endpoint because the CUD functionality will be handled by Webhook model upon webhook create, update, delete automatically splitting the event_types[] column verbs into a single subscription record for each respectively. Stop after creating the table in migration/ create-schema and the OAPI spec definition.

> update the progress tracker and describe this reverse lookup table and endpoint and it's relation to webhooks so when I clear context and we proceed with next batch, you will understand the relationship.

---

## Admin Webhooks Implementation

> review the progress tracker for admin implementation and proceed with next batch. prior to creating files review STANDARDS.md files and CLAUDE.md and at least one endpoint prior example to adhere to no magic strings, DRY, and SOC standards. Model layer is the only layer interacting with the database so expose static filter functions as necessary for services to use. follow TDD best practices. write red phase tests first. then focus on implementation to get to green phase.

> Update progress tracker and we'll reset context and then resume.

> If they are unused, remove them and just create the records without a var.

> remove that field from searchable

> update api-docs index file to reference the new webhooks POST path

> one more tweak. we should support global webhooks and make the environmentId field optional in database, model, admin validation, controller, service, etc. and update documentation for the admin endpoint. if currently non-null in DB, update the migrations/ create-schema file

> Did you add a test when a webhook is created with multiple event types to confirm there is a subscription database record for each type. And when removing it, they are no longer there?

> anything need to be updated on our progress tracker?

---

## Webhook Deliveries & Retry Logic

> We may need to stub this out. I haven't decided how exactly the delivery is going to be handed off to async process

> review how other tests imported the app promise and copy pattern from other working tests

---

## Event Type Seeding & Event Logger Design

> We have implemented all our currently-specified api endpoints with 100% tested and passing - hooray! In preparation for the event logging functionality and webhooks, we need comprehensive event_type data. Analyze the event_type schema to understand it. For every API endpoint we should create an event_type record and the verb should relate to the resource.action for tenant (org/env) scoped endpoints, and admin.resource.action for admin scoped endpoints respectively. Ignore the health check endpoint. Create a new migrations/ file following our existing pattern where we seeded the system permissions with all of these event types.

> If we wanted the api to quickly inspect the request/response of every api request in order to log events, would it be best to add a global middleware like auditLogger or eventProcessor that inserts every event into the database event table. Since we have a service for message system (adapter), we also want an event message published with the payload in CloudEvents 1.0.2 standard which will be picked up by another workflow for webhook delivery, etc. Considering NodeJS has an EventEmitter, what would be the optimal design for handling these as fast and non-blocking as possible, but guaranteeing we don't lose any events for maximum data integrity?

> This is excellent. One other consideration would be to store the event types in memory on app load to prevent needing to look them up for matching path/method on every event. Add that to the design and I think we're cookin' with gas.

---

## Event Logger Implementation

> Create a progress tracker file in api/docs/progress-trackers/ for this plan and it's phases in case we need to clear context and resume. See how we tracked progress for other projects.

> can you change the message attributes to all lowercase

> review the event logging implementation tracker file and make sure it's current and we don't again try to fix errors that were already fixed like previously

> review our progress tracker for EVENT_LOGGER_IMPLEMENTATION and summarize remaining tasks

> if the server is running and this is working, should I see events logged in the event table in the database

---

## System Organization & Environment Setup

> oh, I like the system instead. Add another migration file and seed a System organization with a System environment. The UUID will follow a pattern we define, all padded 0s and then last 2 digits are the org, so this system org will be 01. Then the preceeding 2 digits will be the environments so the system will be 0100.

> XX is the env and YY is the org. You have them reversed in the comment and summary

> It probably got deleted by a test. Check the afterAll and see how we filtered on others to prevent the System Org being deleted. First npm run db:reset to re-seed the DB and make sure no tests are deleting the system org or environment (see other examples where we add these as exclude filter during afterAll)
