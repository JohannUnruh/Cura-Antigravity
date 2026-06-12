## 2026-06-11T07:52:30Z
You are a teamwork_preview_worker. Your working directory is: C:\Users\xjunr\OneDrive\web-apps\Cura-Antigravity\.agents\worker_security_hardening
Your mission is to fix a security privilege escalation vulnerability in firestore.rules.

Please perform the following steps:
1. View firestore.rules around line 45. The update rules for the users collection are:
   allow update: if (isOwner(userId) && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'contractType', 'vacationDaysPerYear', 'contractDocumentUrl', 'entryDate'])) || isAdmin();
2. Modify C:\Users\xjunr\OneDrive\web-apps\Cura-Antigravity\firestore.rules so that `hasFamilyHelperAccess` and `hasFosterCareAccess` are added to the list of keys that owners of user documents cannot self-modify. The updated rule should look like:
   allow update: if (isOwner(userId) && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'contractType', 'vacationDaysPerYear', 'contractDocumentUrl', 'entryDate', 'hasFamilyHelperAccess', 'hasFosterCareAccess'])) || isAdmin();
3. Run `npm run lint` and `npm run build` to verify that all code compiles and lints successfully.
4. Write a handoff.md report in your working directory summarizing the change and the build outcomes.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
