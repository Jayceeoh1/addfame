# AddFame pentru telefon

Acest folder este o aplicație nativă **separată** de site. Nu face parte din proiectul pnpm de la rădăcina repo-ului și nu schimbă site-ul de pe Vercel, plățile, autentificarea sau baza de date.

Aplicația este un înveliș [Capacitor 8.5.3](https://capacitorjs.com/) (ultima versiune stabilă la momentul adăugării). La deschidere încarcă site-ul live în WebView. Când telefonul nu are internet, arată pagina locală `www/index.html` („Nu ai conexiune la internet”).

Identificatorul aplicației este `ro.addfame.app`. Îl poți schimba din `capacitor.config.js` (`appId`) înainte de primul upload în magazine, apoi rulezi `npx cap sync`. După ce aplicația există în Play Console sau App Store Connect, schimbarea id-ului înseamnă o aplicație nouă.

## Ce încarcă aplicația

URL-ul de producție este o singură constantă, `PRODUCTION_URL`, în `capacitor.config.js`:

`https://addfame.ro`

A fost luat din aplicația web existentă:

- `app/layout.tsx` — `metadataBase` și `openGraph.url` sunt `https://addfame.ro`
- rutele API folosesc `process.env.NEXT_PUBLIC_APP_URL || 'https://addfame.ro'`

Host-urile la care WebView-ul are voie să navigheze (restul linkurilor se deschid în browserul telefonului) sunt lista `ALLOWED_HOSTS` din același fișier:

| Host | De ce |
| --- | --- |
| `addfame.ro`, `*.addfame.ro` | site-ul, inclusiv `www.addfame.ro` (folosit la redirectul Instagram OAuth) |
| `*.supabase.co` | API, auth și storage Supabase. Proiectul exact nu este în repo; stă în `NEXT_PUBLIC_SUPABASE_URL`. Dacă producția folosește un domeniu custom, adaugă-l în listă. |
| `stripe.com`, `*.stripe.com` | plata cu cardul (Payment Element). În `next.config.mjs`, CSP permite `js.stripe.com`, `api.stripe.com` și `hooks.stripe.com`. |
| `instagram.com`, `*.instagram.com` | login-ul de business. `app/api/auth/instagram/route.ts` trimite utilizatorul la `https://www.instagram.com/oauth/authorize`. |
| `facebook.com`, `*.facebook.com` | ecranul de login Instagram continuă adesea pe Facebook. |

După orice modificare a configurării:

```bash
cd mobile
npx cap sync
```

## Cerințe

- Node.js 22 (funcționează și cu 20) și npm. Dependențele de aici **nu** se instalează cu `pnpm install` de la rădăcina repo-ului.
- Pentru Android: JDK 21, Android Studio, Android SDK 36 (cum cere proiectul generat).
- Pentru iOS: un Mac cu Xcode 16 sau mai nou și un cont Apple Developer. Proiectul iOS a fost generat și pe Linux; compilarea și urcarea în TestFlight se fac pe Mac (sau pe un serviciu cloud, mai jos).

## Instalare

Din acest folder, nu din rădăcina repo-ului:

```bash
cd mobile
npm install
npx cap sync
```

`npm install` citește `package-lock.json` din acest folder. Lockfile-ul este urmărit în git chiar dacă `.gitignore`-ul de la rădăcină ignoră orice `package-lock.json` (proiectul web folosește pnpm). Nu schimba acel `.gitignore`.

## Android: telefon sau emulator

1. Instalează Android Studio și, în SDK Manager, platforma Android 36 și build-tools 36.
2. Pornește un emulator (Device Manager) sau un telefon cu depanarea USB pornită.
3. Deschide proiectul nativ și apasă Run:

```bash
cd mobile
npx cap open android
```

Din linie de comandă, APK-ul de debug:

```bash
cd mobile
npm run android:debug
```

APK-ul apare la `android/app/build/outputs/apk/debug/app-debug.apk`. Îl poți instala cu:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

`android/local.properties` (calea către SDK) este generat local și nu se comite.

## Android: AAB semnat pentru testarea internă din Play Console

Play Console primește un Android App Bundle semnat, nu APK-ul de debug.

1. Creează aplicația în Play Console cu id-ul `ro.addfame.app`. Activează Play App Signing: Google păstrează cheia de semnare a aplicației, tu păstrezi o cheie de upload.
2. Generează cheia de upload **o singură dată** și ține-o în afara git-ului (plus o copie de rezervă). Fără ea nu mai poți publica actualizări.

```bash
keytool -genkeypair -v \
  -keystore addfame-upload.keystore \
  -alias addfame \
  -keyalg RSA -keysize 2048 -validity 10000
```

3. Pune keystore-ul în `mobile/android/` (fișierele `*.keystore` sunt ignorate de git) și creează `mobile/android/keystore.properties`, tot ignorat:

```properties
storeFile=addfame-upload.keystore
storePassword=PAROLA_KEYSTORE
keyAlias=addfame
keyPassword=PAROLA_CHEIE
```

`android/app/build.gradle` semnează varianta `release` doar dacă acest fișier există. Fără el, build-ul de debug rămâne neschimbat, iar bundle-ul de release iese nesemnat și Play Console îl refuză.

4. Construiește bundle-ul:

```bash
cd mobile
npm run android:bundle
```

Fișierul este `android/app/build/outputs/bundle/release/app-release.aab`.

5. În Play Console: Testare > Testare internă > Creează o versiune > încarcă AAB-ul. Adaugă testerii după adresa de e-mail. Prima versiune trebuie să treacă și prin conținutul din magazin (descriere, politică de confidențialitate, clasificare). Politica publică a site-ului este `https://addfame.ro/politica-de-confidentialitate`.

`versionCode` din `android/app/build.gradle` trebuie să crească la fiecare upload.

## iOS și TestFlight

Capacitor 8 a generat proiectul iOS cu Swift Package Manager (`ios/App/CapApp-SPM/Package.swift`), nu cu CocoaPods. Nu este nevoie de `pod install`.

Pe un Mac:

```bash
cd mobile
npm install
npx cap sync ios
npx cap open ios
```

În Xcode:

1. Deschide `ios/App/App.xcodeproj`. La prima deschidere, Xcode descarcă pachetul `capacitor-swift-pm` (are nevoie de internet).
2. Țintă App > Signing & Capabilities: alege team-ul Apple Developer. Bundle id: `ro.addfame.app`. Creează acest App ID în [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list) dacă Xcode nu îl creează singur.
3. Product > Archive. După arhivă: Distribute App > App Store Connect > Upload.
4. În App Store Connect, la TestFlight, adaugă testerii interni. Primul build trece prin procesarea Apple (de obicei sub o oră) și cere informații de export compliance; aplicația folosește doar HTTPS.

### Codemagic, dacă nu vrei să ții un Mac

1. Conectează repo-ul la [Codemagic](https://codemagic.io/).
2. Alege un runner macOS cu Xcode 16+.
3. Pune certificatul Apple Distribution și profilul de provisioning în Codemagic (Code signing identities).
4. Un flux minim, cu rădăcina de lucru pe repo:

```bash
cd mobile
npm ci
npx cap sync ios
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS' -archivePath build/App.xcarchive archive
xcodebuild -exportArchive -archivePath build/App.xcarchive \
  -exportPath build/ipa -exportOptionsPlist ExportOptions.plist
```

`ExportOptions.plist` îl generezi o dată din Xcode (Distribute App > Export) sau din documentația Codemagic pentru TestFlight. Nu comite certificatul.

## Iconiță și splash

Originalele din `public/` sunt copiate, nemodificate, în `mobile/brand/`:

- `logo.png` (sursa iconiței; 512×512, fundal transparent)
- `icon-512.png`, `icon-192.png`, `apple-icon.png`
- `icon.svg`, `favicon.ico`, `icon-dark-32x32.png`, `icon-light-32x32.png`

`assets/logo.png` este aceeași copie. Din ea, `@capacitor/assets` a generat iconițele și splash-urile deja comise în proiectele Android și iOS (fundal alb `#ffffff`, ca iconița PWA). Culoarea portocalie `#f97316` este `themeColor` din `app/layout.tsx` și este folosită la bara de status.

Pentru un master mai clar, înlocuiește `assets/logo.png` cu un PNG pătrat de cel puțin 1024×1024 (fundal transparent), apoi:

```bash
cd mobile
npm run assets
npx cap sync
```

Comanda nu atinge `public/` din site. Nu o rula cu `--pwa`: ar putea rescrie manifestul site-ului.

## Ce va adăuga PR 2

Acest PR nu leagă site-ul de pluginuri native. Următorul pas, tot în `mobile/` și fără să atingă fluxurile de bani, poate adăuga:

- notificări native prin FCM (Android) și APNs (iOS)
- cameră
- share nativ
- deep link-uri și fișierele `.well-known`
- ascunderea cumpărării badge-ului Verified pe iOS
- ștergerea contului din aplicație
- Sign in with Apple, dacă review-ul Apple îl cere

## De reținut

- WebView-ul Android mărește textul după setarea de font a telefonului. Chrome nu face asta, așa că aceeași pagină arăta mai mare în aplicație și avatarul din „Salut, …” se turtea. `MainActivity` fixează text zoom la 100%, ca în browser.
- User-agent-ul aplicației se termină cu cuvântul `AddFameApp` (Android și iOS, în `capacitor.config.js`). Site-ul folosește token-ul ca să știe că rulează în aplicație. După orice schimbare a configurării, din acest folder: `npx cap sync`.
- Site-ul live se vede imediat în aplicație, fără un build nou de magazin. O modificare de iconiță, de plugin sau de `appId` are nevoie de un build nou.
- Pagina de eroare din `www/` nu are acces la pluginurile Capacitor pe Android. Butonul „Încearcă din nou” reîncarcă `https://addfame.ro`.
- Apple poate întreba, la review, de ce aplicația este un site într-un WebView (ghidul 4.2). PR 2 este locul în care apar funcțiile native care răspund la asta. Până atunci, TestFlight intern este calea potrivită, nu trimiterea directă la App Store.
- O verificare 3-D Secure a băncii poate deschide un domeniu care nu este în `ALLOWED_HOSTS`. În cazul ăsta pagina se deschide în browserul telefonului, nu în aplicație.
