# Architecture Setup Prompts

This document contains the prompts used to establish the foundational architecture, security, and infrastructure of the enterprise API system.

## Summary

- Initial server setup with Express, Swagger UI, health checks, and component standards
- Dependency upgrades and security assessments
- Adapter pattern implementation for external services (email, queue, secrets, storage)
- Multi-tenant architecture design with RBAC, impersonation, and hierarchical groups
- OpenAPI specification development
- Database schema design and migrations
- Sequelize model implementation
- Test infrastructure setup following TDD principles

---

## Server Foundation & Standards

> Great progress. Now let's implement the initial server, app, and swagger ui (displayed based on configured env var flag per design) and the /health route to begin standardizing our app layers. We will first ensure best practice and clean code for these base components and server operation before adding more implementation. In each component directory like routes and controllers generate a STANDARDS.md file we can reference in the future to maintain consistency. These should include design standards, code examples, our middleware order of operations for authentication, validation, authorization, validation, execution, and how exceptions roll up from back end to controllers and how middleware may capture and handle edge cases. Be sure to define our naming conventions and when and how to factor components into new files to maintain small file objectives. Ask me any clarification questions as needed.

> 1. app + server for easier testing
> 2. yes graceful shutdown
> 3. order looks good but likely include parameter validation after authentication for fast fail, then authorization, then request body validation for PUT/PATCH/POST methods, and then implementation
> 4. yes, align these with the error responses we defined in OAPI spec for parity
> 5. yes
> 6. Decide latest best practice and most idiomatic approach
> 7. Start with basic for now but anticipate we'll enhance it later (log these at debug level only)
> 8. I was thinking we have separate Dockerfile and job upon deploy that will run sequelize-cli to perform migrations and that would be a prior step in CI/CD so if it failed, we wouldn't build/push the app Docker image. I'm flexible, however, so what is best practice here?
> 9. Config should follow 12-factor methodology best practice for app portability and fail fast if missing required values sounds good
> 10. Yes those config files and key configs come from ENV values but perhaps with defaults. Again follow 12-factor methodology best practices
> 11. looks good. whatever we decide the key is consistency thereafter for clean code
> 12. yes
> 13. looks good. since you will reference these when creating components but a new or junior coder joining the team also may need to reference them, include enough to skill up team and keep code consistent but not too verbose to waste context memory and tokens
> 14. yes, logical grouping

---

## Dependency Upgrades & Security

> Before proceeding with functionality we want to ensure we are running the latest versions of our package dependencies and resolve any errors, conflicts, or vulnerability warnings. Analyze the current packages and upgrade them all to latest versions and solve any lint or type errors to get the application stable. Be sure to upgrade our test suite and all components to the latest stable versions, including NodeJS versions in our Dockerfiles to minimize security or vulnerability risks. Perform a security assessment on our current project state and make any recommendations for improvement before we proceed adding functionality.

> identify all the security recommendations from the assessment that are not database related or require 3rd-party database like mongo or redis for now and come up with a plan to implement them. Remember external service usage should follow the adapter pattern so the secret manager from google should be an adapter extension of a secrets base adapter, just like email, messageQueue, storage. You already created Sendgrid adapter following that pattern so now implement the messageQueue (redis, google pub/sub, kafka), storage (local, google cloud storage, s3), secrets (local, google secret manager, hashi vault).

---

## Adapter Pattern Implementation

> We created initial implementation of adapters but the server crashes and you need to make sure we maintain stability and api-docs and health checks still work as expected. Fix any issues and linter and type check warnings to remain stable before we continue.

> you didn't test /v1/health ... why don't you take a moment to first update CLAUDE.md with the script commands for this app in package.json to avoid guessing, and also update the API routes/endpoints so you know how to call them (with version for all but api-docs)

> We established the initial adapters but need to implement comprehensive tests. First research the providers' latest sdk documentation to ensure our interfaces will allow to add various providers beyond our local development adapters. For email, Sendgrid and SMTP. For message: Redis, Google Pub/Sub, AWS SQS, and Kafka. For secret: Google Secret Manager, AWS Secrets, Hashi Vault. For storage: local, Google Cloud Storage, AWS S3. Once you verify the interface and adapters will accommodate these providers, write comprehensive tests for each. Once tests are built and fail, following test-driven development best practices, then create the implementation code for remaining adapters (even if we cannot test them yet, make sure the local ones that are configured pass the tests).

> yes, incrementally. if needed, document progress and we can clear context between each one to preserve memory and minimize hallucination risk. let me know if we need to do that or if safe to continue at each step, and how to keep the processing moving along smoothly.

> Fix that failing test and find out why it's empty. Don't ignore it.

> We recently created our primary external services for secrets, messaging, email, and storage using the adapter pattern in the api/services directory and summarized our progress in phases in a markdown file in the api/ directory. Move that file to the api/docs/ directory for later review if necessary and we can proceed with our next task.

> Fix the inconsistent file naming for SECURITY-ASSESSMENT before we continue and remember we want consistency in our naming conventions, whatever we choose.

> We recently implemented the adapter pattern for 4 services (storage, email, queue, secrets). The secrets we created a local EnvSecret but I'd like a default one using the local file system and storing in the secrets/ folder (json objects) for easy testing. Can you describe the Env implementation and whether that's possible or if we should create another adapter for local file types?

> Yes, create a FileSecretsAdapter and let's set this as the default for now in our .env config file.

---

## Multi-Tenant Architecture Design

> '/Users/mike/Downloads/PetPublish-Architecture-Entities Overview (3).jpg' Review this entity diagram, ignoring the lower service-specific section with Animals and Stays. We aim to build a multi-tenant API system that features Organizations with one or more Environments (aka spaces), one or more hierarchical Groups (with parent_id and hierarchy_level for efficient db traversal), Organization Members, Group Members, Roles, Permissions, EnvironmentRolePermissions that associate a Group or Org Member to a role (although we default with group assignments). We will also log Events for every API interaction using a configurable Event Type that maps api endpoint path, method to a verb like "auth.logout" or "device.update" or "auth.register". To simplify tenant (Organization) isolation, our api endpoints for tenant-specific resources will be /orgs/{orgId}/envs/{env}/[resource]... and we will use middleware to validate requests comparing the path parameter values to the orgId and envId in their signed JWT token. To solve for chicken-egg scenario, we will have a defaultEnvId for Organizations, and given a User can be a member of many Organizations, we will store a lastOrgId and lastEnvId so during authentication we know what to include in their JWT. Furthermore our api endpoints will be protected with RBAC and permissions required like "devices:read" "devices:manage" or "sessions:read" or "sessions:manage" etc. We will also implement global Adminstration-scoped endpoints for users/groups with "system:admin" and "system:support" type permissions respectively. These will adhere to separation of concern practices and prefixed with "/admin/" and their OAPI files will be admin-[name].yaml and their controllers and routes will be admin.{Category}.controller.ts and admin.{Category}.route.ts and admin.{Category}.service.ts for easy separation if we ever want to factor them out. For now make necessary updates to the architecture understanding in CLAUDE.md and we will iteratively implement this functionality to maintain system stability. We can be prepared for the Partner, Billing functionality but it is not a priority at this point. We will iterate and add that to the Organization spec over time. As always, feel free to ask me any clarifying questions if needed.

> 1. Assignments is more accurate because permissions are assigned to roles, this would just be assigning roles to either a Group or MembershipId (user who is member of org).
> 2. yes, level 0 is root, and increments from there
> 3. yes, we will store id UUID, environment Id UUID, verb VARCHAR, actor BJSON, object BJSON, target BJSON, and audit BJSON, description TEXT, timestamp, and denormalized fields organization id, organization name, environment name, is webhook event BOOLEAN. audit will include http request/response/headers/ip (including forwarded for, etc.)/user agent and other available data. This should be modeled after W3C Open Social Activity Streams but we will publish payloads in Cloud Events 1.0.2 standard to message queue and store these to database at same time.
> 4. sub (aka userId), orgId, envId, user: {fullName, email}, iat, exp
> 5. for database entities we would name them singular and organization_member and group_member and field names same standard, all lower-case and snake_case
> 6. every organization will have 2 environments, 'Live' [type=live], 'Test' [type=sandbox]

---

## User Impersonation Design

> We have another key feature to plan for and that is user impersonation. There will be impersonation start, pop, end functionality to allow admin users to impersonate any user and we start an impersonation session with required reason and configurable duration. Then based on group hierarchy or tenant scoped users, they will be able to impersonate their sub-group users if they have members:manage permission. they cannot impersonate themselves or peers or superiors (no same hierarchy level, or above, only below). We will append the Event "actor" and JWT with impersonation context and it will chain the users while JWT reissuance represents the effective user - we want auditability to know who perform each event on behalf of whom. Ask any clarifying questions as needed and update the docs to include this key architectural aspect of the system.

> '/Users/mike/Dropbox/Screenshots/Screenshot 2025-10-02 at 9.34.03 PM.png' see attached schema from a previously-designed similar system. Also here is an example event object in Cloud Events 1.0.2 structure published to message queue and the data payload includes our event object of an impersonated user. [example JSON omitted for brevity]

> The JWT issued to impersonation user is like this: [example JWT structure omitted for brevity]

---

## OpenAPI Specification Development

> Now that you have a better understanding of the system scope, we should define additional OAPI specification for endpoints and tags groups for the multi-tenant system with system and tenant level impersonation and hierarchical groups with role assignments to polymorphic org members or groups with nullable fields for membership_id or group_id respectively (at least in database). Let's work in small batches per logical group of functionality to update the docs with necessary endpoints and permissions while maintaining our factoring and naming conventions for small file sizes.

> We already have api-docs/ file and oapi spec for many endpoints. Also as we progress, add a progress summary and next steps file in docs/ like we did for the adapters progress, so we can occasionally clear context along the way.

> each tag group will likely need it's own file to prevent them from getting too large so plan accordingly. admin-{category}-{name}.yaml etc... it may be good to align these to the tags groupings for parity and easy mapping. Only store the $ref in main index file to paths and schemas respectively, and keep the files lean and efficient but well documented.

> wire up what we have so far and we'll test the api-docs page. also update the User schema based on new understanding. once we confirm working we'll commit current progress and reset context so be sure the progress doc is updated so we can reference it to resume work in next context.

> For the User include a full_name field and phone. Although our implementation will be simple, research Schema.org and PortableContacts to identify a universal User record and best practices for the identity table to support optional OAuth and SSO in the future.

> I will handle git commits. First check lint and typecheck to ensure we're still stable. The UI and server are working fine.

> You should factor out that redundant "Unknown error" string to use error constants instead to keep code clean.

> we already have a root-level /constants/ directory so stick with existing pattern. Update CLAUDE.md to ensure you remain aware of existing designs to avoid duplication of effort or inconsistency, then proceed.

> is the progress doc updated? i aim to clear context and then point you to it for fresh iteration

---

## Query Parameter Standards

> I would like to standardize all our list api endpoints parameters for filter, sort, pagination, and fields and use shared common schema objects for efficiency. Fields is simply ?fields[id,type,name]. Filters is ?filter[field1]=value&filter[field2]=value. Sort is ?sort=field1,-field2. We already have standard offset pagination with limit and offset. Some tables, however, will become very large with tens of millions of records or more (events, media [pending], messages [pending]) so it may be best for us to also support cursor pagination. We may also want ?search= or ?query= support. I'm open to suggestions but key is standardization so API users have a predictable and consistent way to interact with the system. For each endpoint/model, we will also want to describe the filterable and sortable fields and include examples for ease of use. This may be a large undertaking so leverate Task subagents where necessary.

> we are not live so just omit deprecated values to keep the code clean

> The fields in the examples are database snake_case but most likely the response will be camelCase so our examples should reflect user's interface not the backend model interface to database. Keep all field name examples in the docs in camelCase (make sure you update CLAUDE.md and context files where necessary to remember this)

> do not add that in just because something is looking for it. use our existing 2 standards. whatever is looking for PaginationInfo you need to replace it with OffsetPaginationInfo

> Why in the Schemas definition I still see PaginationInfo instead of expected OffsetPaginationInfo and CursorPaginationInfo objects or are they defined in responses and don't appear there?

> I see in the Schemas section a single response AuthResponse and a couple errors Error and ValidationError. Should all of our schemas be defined there or what is best practice for request/response/parameters and entities? Our goal is consistency and intuitive following best practice.

> yes please audit and correct so we are consistent and adhere to best practices

---

## Database Schema & Migration Setup

> let's create our database layer and replace current mocks with actual Sequelize models. I would like to build the database and support progressive migrations along the way which we will automate in our CI/CD pipeline as well. Add package.json scripts for npx sequelize-cli commands to migrate undo undo all and reset (undo and then migrate again). We have an api/migrations/ folder where we will create each migration file. Naming convention should be a datetimestamp-some-name.ts and I prefer the up and down syntax is SQL so we could copy/paste and apply in other environments if we choose. local database is postgres. via shell let's use psql -U mike -d postgres -c "CREATE DATABASE enterprise;" first migration will be a database-cleanup and it will actually drop triggers, tables, etc. and the next will be the create-schema and it will create the database, indexes, triggers (auto update created_at and updated_at fields). primary keys will be UUID (I prefer v1 which if we migrate to a doc db is easier to index and faster queries). If we have to use v4, that's okay too, but I think collision risk is low. recommend a standard naming convention for type and status fields and remember our denormalization preferences for events, event type, to minimize JOINs where possible for maxium performance [and we will write the values at insert/update operations]. pause after creating the database and testing db:migrate and then we will proceed with the models/ implementation, and update services/ as necessary. as always, follow industry standards and best practices, store dates in UTC (they can be localized by clients), and leverage enums for strict typing where it makes sense. ask me any clarification questions as needed.

> The endpoints and schemas are well defined at api/api-docs/ in open api format. We will implement this entire database supporting all endpoints. The user should also include convenience fields tracking last login, and many should have status to support various lifecycles and workflows. Review the entire api specification and schema definitions to formulate a comprehensive plan for this schema. Prioritize performance at scale with 100-200 million records anticipated over time.

> shouldn't we be consistent throughout the app? why a string for that field?

---

## Sequelize Model Implementation

> We just added the database migrations to the api, along with sequelize, and updated tests. Analyze the database schema and seed scripts in api/migrations/ and next we will create the sequelize models/ and replace the mocks we created for initial tests. If needed, the api scope definition is in CLAUDE.md and detail documentation in api/api-docs/ oapi spec.

> typecheck, lint, ensure progress doc current, and tell me what to prompt you to resume after clear context

> What prompt should I tell you to resume where we left off after I clear context

> why are we importing sequlize into our service layer? shouldn't we maintain separation and all that is handled at model layer?

> make sure all our tests pass now
