## 2026-06-11T07:49:34Z

You are a teamwork_preview_worker. Your working directory is: C:\Users\xjunr\OneDrive\web-apps\Cura-Antigravity\.agents\worker_access_impl
Your mission is to implement the access control permissions and settings UI for the Family Helper and Foster Care modules.

Please perform the following steps:
1. Modify C:\Users\xjunr\OneDrive\web-apps\Cura-Antigravity\src\types\index.ts to add optional fields to the UserProfile interface:
   - hasFamilyHelperAccess?: boolean;
   - hasFosterCareAccess?: boolean;

2. Modify C:\Users\xjunr\OneDrive\web-apps\Cura-Antigravity\src\app\settings\page.tsx to manage these new permissions in the Admin User Management:
   - Update newUserForm state initialization to include: hasFamilyHelperAccess: false, hasFosterCareAccess: false
   - Update editUserForm state initialization to include: hasFamilyHelperAccess: false, hasFosterCareAccess: false
   - In handleCreateUser: make sure to copy hasFamilyHelperAccess and hasFosterCareAccess from newUserForm into profileToSave.
   - In handleUpdateUser: make sure to copy hasFamilyHelperAccess and hasFosterCareAccess from editUserForm into profileToSave.
   - In the onClick handler for editing a user, populate the editUserForm state with u.hasFamilyHelperAccess || false and u.hasFosterCareAccess || false.
   - In the "Benutzer anlegen" modal, add checkbox inputs with labels for "Zugriff auf Familienhilfe" and "Zugriff auf Pflegefamilien". Ensure that they update newUserForm.hasFamilyHelperAccess and newUserForm.hasFosterCareAccess.
   - In the "Benutzer bearbeiten" modal, add the same checkboxes updating editUserForm.hasFamilyHelperAccess and editUserForm.hasFosterCareAccess.
   - Style them with Tailwind CSS to match other form fields in the modal.

3. Modify C:\Users\xjunr\OneDrive\web-apps\Cura-Antigravity\src\components\layout\Sidebar.tsx to implement dynamic sidebar navigation:
   - Add menu items for Familienhilfe (href: "/family-helper") and Pflegefamilien (href: "/foster-care") to the navigation array, using appropriate icons (e.g. HeartHandshake and Baby from lucide-react).
   - Filter the navigation items inside the Sidebar component so that:
     - "/family-helper" is only displayed if userProfile?.hasFamilyHelperAccess is true or userProfile?.role === 'Admin'
     - "/foster-care" is only displayed if userProfile?.hasFosterCareAccess is true or userProfile?.role === 'Admin'

4. Modify C:\Users\xjunr\OneDrive\web-apps\Cura-Antigravity\firestore.rules to restrict access:
   - For /family_cases/{document=**}: allow read/write only if the authenticated user has hasFamilyHelperAccess == true or role == 'Admin' in their user profile doc in firestore.
   - For /foster_families/{document=**} and /foster_children/{document=**}: allow read/write only if the authenticated user has hasFosterCareAccess == true or role == 'Admin' in their user profile doc.

5. Verify your changes:
   - Run 'npm run lint' and 'npm run build' using run_command to ensure there are no compilation or syntax errors.
   - Document any errors or warnings and ensure they are fixed.

6. Write a detailed handoff.md report inside your working directory with the list of changes, the file diff summary, and command outputs for build/lint.
