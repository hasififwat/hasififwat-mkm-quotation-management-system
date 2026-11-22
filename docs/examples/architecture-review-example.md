# Example: A clear, narrative architecture review

> **Purpose:** This is a writing-style example, not an up-to-date technical assessment or a source of truth for implementation. It is adapted from a review of MKM at commit 8490cb8f. Verify all technical claims against the current code before using them in a real report. Match the explanation style and reasoning depth, not the headings or wording.

# MKM architecture review

## What I found

After reviewing the MKM codebase, there are two things worth paying particular attention to.

**First, the new quotation revision system is a major improvement.** Previously, editing a quotation could overwrite the original information. The new design keeps each saved version separately, including the exact PDF issued to the customer.

**Second, the spreadsheet import feature has a problem that still needs fixing.** I found a case where the system showed staff that only a room price would change, but saving the import also changed hotel settings that weren't mentioned in the review.

The second issue concerns me more right now because staff could approve one change without knowing the system will apply additional changes.

### What I reviewed

I used commit 8490cb8f from the migration/nextjs-upgrade branch as the reference for this review.

There are a few limitations worth knowing:

- The local checkout was 12 commits behind that branch and contained unfinished work.
- The production deployment record pointed to the older React Router application.
- I couldn't verify that the reviewed Next.js version had been deployed or activated in a hosted environment.

So, when I describe the new quotation functionality, I'm referring to what existed in the code and what had been tested in a separate test environment, not necessarily what staff were using in production.

---

## 1. How MKM works

MKM has two main parts.

**Next.js handles the interface.** This is where staff log in, manage packages, prepare quotations and review information.

**Convex handles the data and business rules.** It stores packages, customers and quotations, and decides whether operations such as saving, editing or deleting records are allowed.

An important detail is that the browser can communicate directly with Convex. Not every operation passes through Next.js first.

This means protecting a page in Next.js isn't enough to secure the data. Convex must also check whether someone is authorized to perform an operation.

### How packages and quotations are connected

Staff maintain a catalogue containing packages, hotels, rooms, prices and flights.

When preparing a quotation, they select information from that catalogue.

However, **the catalogue and a saved quotation serve different purposes.**

The catalogue represents what is currently available. A saved quotation represents what was offered to a customer at a particular time.

For example:

- On Monday, a customer receives a quotation for RM5,000.
- On Wednesday, staff update the package price to RM5,500.
- When staff reopen Monday's quotation, it should still show RM5,000.

Otherwise, the system would no longer have a reliable record of what was originally offered.

This distinction is the reason behind several architectural decisions in the migration.

---

## 2. Why quotation revisions needed a new design

### The original problem

Previously, when staff edited a quotation, the system updated the existing database record. That meant the original quotation information could disappear.

Imagine this situation:

1. Staff create quotation MKM-001 for RM5,000.
2. The customer requests a different hotel.
3. Staff edit the quotation, increasing the price to RM5,800.
4. A few days later, the customer asks about the original RM5,000 offer.

The problem is that the earlier version may no longer exist as a complete quotation. It has been replaced by the updated information.

There was another issue. Some historical information still came from the live package catalogue. Renaming a room, for example, could change the room name displayed on an older quotation.

Both problems make it difficult to establish exactly what the customer was offered.

### How the new design solves this

Instead of treating a quotation as a single record that keeps changing, the new system separates the quotation itself from its individual versions.

It introduces something called a **quotation family**.

Think of a quotation family as a folder containing all versions of the same quotation.

For example:

**Quotation MKM-001**
- R0 — Original quotation, RM5,000
- R1 — First revision, RM5,800
- R2 — Second revision, RM6,100 (current)

Each revision keeps its own prices, selected rooms, hotels and other quotation details.

The family record keeps track of information shared between all versions, such as the quotation reference, which revision is current, and whether the quotation has been archived.

This separation is useful because staff normally want to see only the latest quotation in their work list, but they still need access to older versions when reviewing history.

### Why not use a simpler database structure?

One alternative was to store all revisions as separate quotation records and link them together.

That sounds simpler initially, but it raises another question: where should shared information live?

For example, if staff archive MKM-001, should the system update the archive status on R0, R1 and R2?

If so, the same information is duplicated across multiple records. If one update fails, the revisions could disagree about whether the quotation is archived.

Another option would be to make R0 responsible for managing the other revisions. But then R0 would have two unrelated jobs: preserving the original quotation and managing the entire quotation's current state.

A more complex alternative, event sourcing, was also considered. That would reconstruct a quotation by replaying all the changes made to it. However, it introduces additional work for replaying events and handling older event formats.

The family approach avoids these problems.

**Each revision is responsible for preserving one saved quotation. The family is responsible for managing the revisions as a group.**

### The challenge: migrating existing quotations

The new design cannot simply be enabled while the old editing system continues operating.

Imagine migrating quotations into the new revision structure, only for an older version of the application to overwrite one of those records afterward.

That would undermine the history-preservation guarantee.

To prevent this, the migration introduces a permanent restriction on the old write operations. Existing data is migrated in controlled batches, and the new revision functionality is enabled separately.

There is also a rule against inventing missing history.

For example, if the database contains R3 but no evidence of R0, R1 or R2, the system preserves R3 and records that its earlier history is unknown. It does not create fictional revisions to fill the gaps.

---

## 3. Why saving a quotation needs protection against retries

Another issue involves what happens when staff click Save but don't receive a response.

Consider this situation:

1. Staff click Save to create a quotation.
2. Convex successfully saves it.
3. A network problem prevents the success response from reaching the browser.
4. Staff think saving failed, so they click Save again.
5. The system creates a second quotation.

The staff member intended to save one quotation, but the database now contains two.

The new saving mechanism addresses this by giving each save attempt a unique identity.

If the same request is retried, Convex can recognize that it was already completed and return the original result instead of creating another record.

There is an important difference between **retrying the same save** and **making a new edit**.

Retrying a completed request should return the previous result.

Making a new edit should create a new revision, but only if the staff member started from the latest revision. If someone else has saved a newer version in the meantime, the system rejects the outdated edit rather than silently overwriting newer work.

This protects both against accidental duplicates and against two people unknowingly editing different versions of the same quotation.

---

## 4. Why the system needs to store the actual PDF

Preserving quotation information in the database doesn't automatically preserve the PDF the customer received.

Suppose staff generated a PDF in January.

In March, the company updates its logo, terms and conditions, or PDF layout.

If the system generates January's PDF again using the latest template, the document might look different from the one originally sent to the customer.

Even though the prices and itinerary remain unchanged, it is no longer the exact same document.

The new design solves this by storing the generated PDF itself.

Once a revision is saved, the system schedules a separate process to generate its PDF from the saved information. After generation, the PDF is stored for future retrieval.

When staff reopen that document later, they receive the stored PDF rather than a newly generated one.

### What happens if PDF generation fails?

Saving a quotation and generating its PDF are separate operations.

This means a quotation can be saved successfully even if the PDF is still being generated.

That introduces another problem: what happens if the PDF worker crashes before completing its job?

The system needs a way to identify unfinished PDF jobs and retry them safely without accidentally replacing an already issued document.

The testing process uncovered such a failure scenario, which led to an additional recovery mechanism.

The intended result is that each successfully issued PDF remains unchanged, while interrupted generation can be recovered.

---

## 5. The most important problem I found: spreadsheet imports

This is the issue I would investigate and fix first.

MKM allows staff to import spreadsheet data to update packages and prices.

Before applying the changes, the system presents a review showing what will change.

That's important because staff should know exactly what they're approving.

### What went wrong

I tested the spreadsheet parser and save logic using the reviewed code.

In my test, the review screen indicated that only one field would change:

**Quad price**

However, when the changes were applied, the system also:

- Enabled a hotel that was previously disabled.
- Cleared that hotel's placeholder value.

Neither change had been shown to staff in the review.

This means the review and the actual save operation don't agree about which fields are being changed.

### Why this happens

The code that prepares the review doesn't work in exactly the same way as the code that saves the changes.

The review compares selected hotel information, including names and meals.

But the saving operation rebuilds hotel records and assigns default values to some fields.

As a result, the save can modify fields that the review never identified as changes.

The system already has protection against saving outdated package information. But that protection solves a different problem.

It can detect whether data has changed since staff reviewed it.

It cannot detect whether the save operation is changing **more fields than staff approved**.

### What I would change

I would make the review and the save operation use the same definition of a change.

For example, if the review identifies only a Quad price update, the save should apply only that approved update.

Any additional hotel, meal or room changes should either appear in the review or remain untouched.

This would make the review screen a reliable representation of what will actually be written to the database.

### There is another problem with applying imports

The system currently applies package changes and flight changes through separate operations.

That creates two risks.

**First, the data may change while staff are reviewing it.**

Flight updates don't consistently check the exact version of the flight that staff reviewed. If another staff member changes that flight before the import is applied, the original approval may no longer reflect the latest data.

**Second, part of an import can succeed while a later operation fails.**

For example, the package changes might be saved successfully, but one of the flight operations could fail afterward.

This leaves the database partially updated.

I would address this by checking the reviewed flight data again when applying changes and making sure the system can identify exactly which operations succeeded.

If imports continue to be applied in multiple steps, the system also needs a reliable way to resume or recover from partial failures.

---

## 6. Some protections are implemented in one place but missing elsewhere

Another pattern appeared while reviewing the project's history.

Several bugs were fixed in one part of the application, only for similar problems to appear through another operation.

For example, the manual package editor gained protection against modifying flights and room types that were already referenced by quotations.

But spreadsheet imports and standalone flight deletion needed separate fixes to enforce the same rule.

Something similar happened with access control. After quotation operations were protected, client history and merge operations still needed additional corrections.

This suggests a broader architectural problem.

**A business rule may be enforced by one operation without being consistently enforced by every other operation that changes the same data.**

The application has several ways of modifying related records. When a rule is added, it is easy to overlook one of those paths.

I would make these rules explicit and test them against every relevant Convex operation, not just the screen where the original bug was discovered.

### Staff permissions need another look

The project's earlier authentication design described staff account provisioning as an administrator-only operation.

However, the reviewed provisioning handler accepted any authenticated identity, and three public profile maintenance operations didn't contain identity checks in their source.

I hadn't verified whether these operations were reachable in the hosted environment, so I wouldn't claim that this was an exploitable production vulnerability without further testing.

But the code raised an important question:

**Who is actually supposed to be allowed to create staff accounts, change profiles and run maintenance operations?**

That policy needs to be decided explicitly.

Once the intended permissions are clear, they should be enforced within the relevant Convex handlers, including operations that don't have a normal user interface.

The repository's feature inventory could help with this, but it also needed updating. At the reviewed commit, it was missing two routes and 21 Convex operations.

---

## 7. Some architectural decisions still don't have a clear explanation

The repository contains substantial evidence explaining why the quotation revision system was designed the way it was.

However, I couldn't establish the original reasoning behind two broader technology decisions:

- Why Convex was originally chosen over Supabase for data storage.
- Why the application was migrated from React Router to Next.js.

The migration documentation suggests that the team wanted to preserve existing staff workflows while replacing the frontend framework.

That explains how the migration was approached, but it doesn't establish why Next.js was preferred.

The authentication migration is better documented. Its goals included reducing sequential authentication and data-fetching requests during navigation, as well as fixing a login issue that sometimes required a second submission.

I would keep these distinctions clear rather than inventing reasons for choices that weren't documented.

---

## 8. What still needs checking before production rollout

The quotation revision work underwent substantial testing using a separate Convex backend.

Those tests included migration, saving, retry behavior and restoration of stored PDFs.

However, successful testing in a disposable environment does not mean the production migration is automatically ready.

Before enabling it on a hosted system, there are still operational questions to answer:

- Is the existing production data compatible with the migration?
- Are the frontend and backend deployments using the correct versions?
- Are the necessary backup and restore permissions available?
- Can the PDF worker handle the expected workload?
- Has the migration and rollback process been verified against the actual deployment environment?

There is also a separate uncertainty involving spreadsheet interpretation.

The browser importer and an older extraction script interpreted the Aziziah and Taif meal columns in different orders.

We need to confirm which mapping matches the authoritative spreadsheet before deciding which implementation is correct.

---

## 9. Which decisions should be documented for future developers?

I found eight local draft Architecture Decision Records (ADRs). These covered subjects such as spreadsheet assumptions, synchronization ownership and flight identifiers.

I would add or finalize four broader decisions because they affect multiple parts of the system.

### Quotation revisions and migration

Document why quotations use families and revisions, why historical links must keep pointing to the exact saved version, and why the old write operations must remain disabled even during rollback.

This matters whenever someone introduces a new editor, maintenance operation or deployment procedure.

### Original PDF preservation

Document why previously issued PDFs must be retrieved from stored files instead of being regenerated.

Also explain what happens when PDF generation fails or an original historical PDF is unavailable.

### Spreadsheet review and approval

Define exactly what staff are approving when they confirm an import.

The documentation should establish how the review relates to the actual database changes, how concurrent changes are detected, and what happens when an import only partially succeeds.

The reproduced Quad price issue would make a useful test case for this decision.

### Staff and maintenance permissions

Document who can create staff accounts, update profiles and perform repair or maintenance operations.

This should cover direct backend operations as well as normal application screens.

The goal is to prevent future development from accidentally introducing a new route around an existing permission rule.

---

## 10. What I would do next

I would focus on two issues before spending more time refining the wider architecture documentation.

**Priority 1: Fix the spreadsheet import review.**

This was the clearest reproduced correctness problem in the review.

Staff could approve a change without being shown everything that would be modified. I would first make the review and save behavior consistent, then add tests proving that unapproved fields remain unchanged.

**Priority 2: Define and enforce maintenance permissions.**

The code left uncertainty about which authenticated staff members should be allowed to perform sensitive operations.

I would settle the intended access rules and verify that every relevant Convex handler enforces them.

The quotation revision architecture appeared to address important weaknesses in the previous design, but production activation still needed its own operational verification.

### Final assessment

The biggest lesson from this review is that **the system needs to enforce the same rules regardless of how staff reach an operation**.

A quotation should preserve its history whether it is edited through the normal screen or a maintenance process.

A spreadsheet import should change only what staff reviewed and approved.

A permission rule should apply whether someone uses the Next.js interface or calls Convex directly.

MKM had already introduced several protections in these areas. The next improvement was making sure those protections were consistent across every operation that could affect the same data.

*Evidence note: This historical example was based on repository history, source code, existing test records, deployment metadata and an in-memory CSV test. It does not establish current hosted deployment behavior.*
