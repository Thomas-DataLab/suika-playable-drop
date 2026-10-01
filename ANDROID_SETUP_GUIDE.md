# Android Setup & Build Guide: Suika Merge Drop

This guide covers how to download the auto-built APK from GitHub Actions, install it on an Android phone, or build and customize it locally using [Capacitor](https://capacitorjs.com/) and [Android Studio](https://developer.android.com/studio).

---

## 1. Quick Start: Download Pre-built APK from GitHub Actions

You don't need Android Studio installed to test the game on an Android phone! Every push or tag to the repository triggers an automated cloud build.

### How to Download:
1. Open your repository on GitHub.
2. Click on the **Actions** tab in the top navigation bar.
3. Select the latest workflow run named **Build Android APK**.
4. Scroll to the bottom to find the **Artifacts** section.
5. Click **suika-merge-drop-debug-apk** to download the ZIP containing `suika-merge-drop-debug.apk`.
6. Alternatively, check the **Releases** tab for tagged releases (e.g., `v1.0.0`) where the `.apk` is directly attached.

### How to Install on Android Device:
1. Transfer the `.apk` file to your Android phone via USB, Google Drive, or email.
2. Tap on the `.apk` file in your phone's File Manager.
3. If prompted with *"Install unknown apps"*, toggle **Allow from this source**.
4. Tap **Install** and then **Open** to play.

---

## 2. Local Setup & Building with Android Studio

If you want to modify code, add custom AdMob banners, or generate signed Google Play Store App Bundles (AAB), follow these steps.

### Prerequisites:
- **Node.js**: v18 or v20+ ([nodejs.org](https://nodejs.org/))
- **Java JDK**: OpenJDK 17 or Eclipse Temurin 17
- **Android Studio**: Latest Hedgehog / Iguana / Jellyfish with:
  - Android SDK Platform 34+
  - Android SDK Build-Tools 34+
  - Android SDK Command-line Tools

### Step-by-Step Local Setup:

1. **Install Node dependencies**:
   ```bash
   npm install
   ```

2. **Prepare Web Assets**:
   Package the clean web assets into `dist/android-web`:
   ```bash
   node scripts/package-all.js
   ```

3. **Initialize & Sync Android Project**:
   ```bash
   npx cap add android
   npx cap sync android
   ```
   *(If the `android/` directory already exists, running `npx cap sync android` will update assets and plugins).*

4. **Launch Android Studio**:
   ```bash
   npx cap open android
   ```
   Or open the `android/` folder inside Android Studio.

5. **Run on Device or Emulator**:
   - Connect an Android device via USB with **USB Debugging** enabled (Developer Options).
   - In Android Studio, select your device from the device dropdown.
   - Click the green **Run (Play)** button or press `Shift + F10`.

---

## 3. Command-Line APK Build (No Android Studio GUI)

If you have Android SDK and Java 17 installed in your environment, you can build directly from the terminal:

```bash
# 1. Sync web files
node scripts/package-all.js
npx cap sync android

# 2. Build debug APK using Gradle
cd android
./gradlew assembleDebug

# Output APK path:
# android/app/build/outputs/apk/debug/app-debug.apk
```

To install directly to a connected device via ADB:
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 4. Google Play Store Release (Signed Android App Bundle - AAB)

Google Play requires the **AAB (Android App Bundle)** format for new apps.

### Step 1: Generate a Keystore
Run keytool in your terminal:
```bash
keytool -genkey -v -keystore suika-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias suika-key
```

### Step 2: Configure `android/app/build.gradle`
Add signing config:
```groovy
android {
    ...
    signingConfigs {
        release {
            storeFile file("path/to/suika-release-key.jks")
            storePassword "your-store-password"
            keyAlias "suika-key"
            keyPassword "your-key-password"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Step 3: Build AAB
```bash
cd android
./gradlew bundleRelease
```
The output file will be at:
`android/app/build/outputs/bundle/release/app-release.aab`

Upload this file to the [Google Play Console](https://play.google.com/console).

---

## 5. Capacitor Configuration Reference

The game configuration is managed in `capacitor.config.json`:
- `appId`: `space.minhtu.suikamerge` (Unique Android package identifier)
- `appName`: `Suika Merge Drop` (Display name on home screen)
- `webDir`: `dist/android-web` (Source of packaged web files)
- `backgroundColor`: `#0d1117` (Prevents white flashes during boot)
- `ScreenOrientation`: Locked to `portrait` for ideal physics gameplay.
