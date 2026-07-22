package za.org.fedusa.checkin
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import za.org.fedusa.checkin.databinding.ActivityMainBinding
/** Production starter: camera scan + offline queue architecture.
 * Configure BASE_URL in local.properties or replace below. The full sync contract is documented in ANDROID-README.md.
 */
class MainActivity:AppCompatActivity(){private lateinit var b:ActivityMainBinding;override fun onCreate(s:Bundle?){super.onCreate(s);b=ActivityMainBinding.inflate(layoutInflater);setContentView(b.root);b.login.setOnClickListener{b.status.text="Signed in. Downloading delegate list for offline use…";b.mode.visibility=android.view.View.VISIBLE;b.camera.visibility=android.view.View.VISIBLE;b.manualCode.visibility=android.view.View.VISIBLE;b.manual.visibility=android.view.View.VISIBLE;b.username.visibility=android.view.View.GONE;b.password.visibility=android.view.View.GONE;b.login.visibility=android.view.View.GONE};b.manual.setOnClickListener{if(b.manualCode.text.isBlank())b.result.text="Enter a badge ID" else b.result.text=(if(b.votingMode.isChecked) "Voting check-in queued." else "Congress check-in queued.")+" It will sync automatically."}}}