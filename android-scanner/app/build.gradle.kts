plugins { id("com.android.application"); id("org.jetbrains.kotlin.android"); id("com.google.devtools.ksp") }
android { namespace="za.org.fedusa.checkin"; compileSdk=35
 defaultConfig { applicationId="za.org.fedusa.checkin"; minSdk=26; targetSdk=35; versionCode=1; versionName="1.0" }
 buildFeatures { viewBinding=true }
}
dependencies { implementation("androidx.core:core-ktx:1.15.0"); implementation("androidx.appcompat:appcompat:1.7.0"); implementation("com.google.android.material:material:1.12.0"); implementation("androidx.camera:camera-camera2:1.4.1"); implementation("androidx.camera:camera-lifecycle:1.4.1"); implementation("androidx.camera:camera-view:1.4.1"); implementation("com.google.mlkit:barcode-scanning:17.3.0"); implementation("androidx.room:room-runtime:2.6.1"); implementation("androidx.room:room-ktx:2.6.1"); ksp("androidx.room:room-compiler:2.6.1"); implementation("androidx.work:work-runtime-ktx:2.10.0"); implementation("com.squareup.okhttp3:okhttp:4.12.0"); implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3") }
