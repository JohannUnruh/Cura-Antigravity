// Set dummy environment variables to prevent Firebase SDK initialization errors during testing
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "dummy-api-key";
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = "dummy.firebaseapp.com";
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "dummy-project";
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = "dummy.appspot.com";
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = "12345678";
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = "1:1234:web:1234";

async function main() {
    try {
        // Dynamically import test suites AFTER setting env vars
        await import("./spfh/feature1.test");
        await import("./spfh/feature2.test");
        await import("./spfh/feature3.test");
        await import("./spfh/feature4.test");
        await import("./spfh/feature5.test");
        await import("./spfh/feature6.test");
        await import("./spfh/scenarios.test");
        await import("./spfh/workshopBacklog.test");
        await import("./spfh/caseCounter.test");
        await import("./fosterCare.test");
        await import("./dataScope.test");
        await import("./contracts.test");
        await import("./contractHeaderLayout.test");
        await import("./contractOverview.test");
        await import("./employeeContractArchive.test");
        await import("./firestoreValues.test");
        await import("./voiceDeduplication.test");
        await import("./aiAnalysis.test");
        await import("./aiPrefill.test");
        await import("./timeEntryUndefined.test");
        await import("./spfh/familyCaseUndefined.test");
        await import("./spfh/budgetCalculation.test");


        const { runAllSuites } = await import("./test-framework");
        const results = await runAllSuites();
        
        if (results.failed > 0) {
            console.error(`\nTest Run FAILED. ${results.failed} tests failed.`);
            process.exit(1);
        }
        console.log(`\nTest Run PASSED. All ${results.passed} tests passed successfully.`);
        process.exit(0);
    } catch (error) {
        console.error("Test execution failed with unexpected error:", error);
        process.exit(1);
    }
}

main();
