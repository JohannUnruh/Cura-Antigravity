# 🔔 Push-Benachrichtigungen für Cura

## Übersicht

Die Cura-App unterstützt jetzt Push-Benachrichtigungen für Erinnerungen (z.B. wöchentliche Gebetsanliegen).

### Features

- ✅ **Manuelle Erinnerungen** erstellen mit Titeln und Nachrichten
- ✅ **Wöchentliche/Monatliche Wiederholungen** möglich
- ✅ **Push-Benachrichtigungen** an Desktop (Chrome, Edge, Firefox) und Android
- ✅ **Automatische wöchentliche Zustellung** jeden Montag um 09:00 Uhr
- ✅ **Test-Benachrichtigung** zum Überprüfen der Einrichtung

### Plattform-Support

| Plattform | Browser | Support |
|-----------|---------|---------|
| **Windows/Mac** | Chrome, Edge, Firefox | ✅ Voll |
| **Android** | Chrome | ✅ Voll |
| **iOS** | Safari | ❌ Nur mit PWA (ab iOS 16.4) |
| **iOS** | Chrome | ❌ Nicht unterstützt |

---

## 📋 Einrichtung

### Schritt 1: VAPID Key generieren

1. Öffne die [Firebase Console](https://console.firebase.google.com/)
2. Wähle dein Projekt `cura-ant`
3. Gehe zu **Project Settings** (Zahnrad-Symbol)
4. Tab **Cloud Messaging**
5. Bei **Web Push certificates** auf **Generate Key Pair** klicken
6. Den **VAPID Key** kopieren (beginnt mit `BKag...`)

### Schritt 2: VAPID Key in .env.local eintragen

Füge in `.env.local` hinzu:

```env
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BKag...dein-key-hier
```

> ⚠️ **WICHTIG**: Den Key niemals committen! `.env.local` ist in `.gitignore`.

### Schritt 3: App starten

Der Service Worker (`public/firebase-messaging-sw.js`) ist minimalistisch und benötigt keine Firebase SDK im Worker selbst. FCM Token wird client-seitig generiert.

```bash
npm run dev
```

### Schritt 5: Cloud Functions deployen

```bash
# Functions bauen
cd functions
npm run build

# ALLE Functions deployen (inkl. neuer Reminder-Functions)
firebase deploy --only functions --project cura-ant
```

Folgende Functions werden deployed:
- `sendScheduledReminders` (wöchentlich, Montag 09:00)
- `sendImmediateReminder` (on-demand)
- `cleanupInvalidTokens` (monatlich)

### Schritt 6: Firestore Rules deployen

```bash
firebase deploy --only firestore:rules --project cura-ant
```

### Schritt 7: App Hosting deployen

```bash
# Zurück zum Projekt-Root
cd ..

# App bauen und deployen
npm run build
firebase apphosting:deploy --project cura-ant
```

---

## 🎯 Verwendung in der App

### 1. Einstellungen → Benachrichtigungen

Als Admin gibt es jetzt einen neuen Tab **"Benachrichtigungen"** in den Einstellungen.

### 2. Berechtigung erteilen

1. Auf **"🔔 Berechtigung erteilen"** klicken
2. Browser-Dialog mit **"Zulassen"** bestätigen
3. Token wird automatisch registriert

### 3. Test-Benachrichtigung senden

Auf **"📬 Test-Benachrichtigung"** klicken - eine Browser-Benachrichtigung sollte erscheinen.

### 4. Erinnerungen verwalten

- **"Neue Erinnerung erstellen"** klicken
- Typ wählen (Gebetsanliegen, Geburtstag, Benutzerdefiniert)
- Titel und Nachricht eingeben
- Startdatum wählen
- Wiederholung (Einmalig/Wöchentlich/Monatlich)
- Speichern

---

## 📁 Neue Dateien

| Datei | Zweck |
|-------|-------|
| `src/types/index.ts` | `Reminder`, `FcmToken` Interfaces |
| `src/lib/firebase/services/reminderService.ts` | CRUD-Service |
| `src/contexts/PushNotificationContext.tsx` | FCM Client-Integration |
| `public/firebase-messaging-sw.js` | Service Worker |
| `src/components/ui/ReminderModal.tsx` | Modal zum Erstellen |
| `src/components/ui/ReminderList.tsx` | Erinnerungsliste |
| `src/app/settings/page.tsx` | Neuer Tab "Benachrichtigungen" |
| `functions/src/reminderFunctions.ts` | Cloud Functions |
| `firestore.rules` | Security Rules erweitert |

---

## 🔧 Troubleshooting

### "Push wird nicht unterstützt"

- Browser aktualisieren (Chrome, Edge, Firefox empfohlen)
- Auf iOS: PWA installieren (App-Icon auf Homescreen)

### "Berechtigung verweigert"

- Browser-Einstellungen → Website-Einstellungen → Benachrichtigungen
- Dort `cura-ant.web.app` auf "Zulassen" setzen

### Keine Benachrichtigung erhalten

1. Test-Benachrichtigung senden
2. Wenn das funktioniert: Cloud Function Logs prüfen
   ```bash
   firebase functions:log --only sendScheduledReminders --project cura-ant
   ```

### Token ungültig

- In Einstellungen auf "🔄 Aktualisieren" klicken
- Oder Berechtigung entziehen und neu erteilen

---

## 📊 Cloud Function Logs

```bash
# Alle Reminder-Logs
firebase functions:log --project cura-ant | grep -i reminder

# Nur Scheduled Reminders
firebase functions:log --only sendScheduledReminders --project cura-ant

# Nur Immediate Reminders
firebase functions:log --only sendImmediateReminder --project cura-ant
```

---

## 🔒 Security

- **Firestore Rules**: Jeder User sieht nur eigene Erinnerungen
- **FCM Tokens**: Nur für eigenen User speicherbar
- **Cloud Functions**: Nur authentifizierte User können aufrufen
- **VAPID Key**: Über Firebase Console verwaltet, nicht im Code

---

## 📝 Nächste Schritte (Optional)

- [ ] Automatische Erinnerungen aus Consultation.smartCheck.timeBound
- [ ] E-Mail-Fallback für iOS-Nutzer
- [ ] Erinnerungen in Klienten-Detailansicht erstellen
- [ ] Batch-Verarbeitung für größere User-Zahlen

---

*Erstellt: 31. März 2026*
