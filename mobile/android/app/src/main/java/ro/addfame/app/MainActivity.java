package ro.addfame.app;

import android.content.res.Configuration;
import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Chrome ignores the system font scale. Android WebView applies it as
        // text zoom, so the same page looks larger in the app and the greeting
        // avatar (a fixed height inside a shrinking flex row) becomes an oval.
        lockTextZoom();
    }

    @Override
    public void onResume() {
        super.onResume();
        lockTextZoom();
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        lockTextZoom();
    }

    private void lockTextZoom() {
        if (getBridge() == null) return;
        WebView webView = getBridge().getWebView();
        if (webView == null) return;
        webView.getSettings().setTextZoom(100);
    }
}
