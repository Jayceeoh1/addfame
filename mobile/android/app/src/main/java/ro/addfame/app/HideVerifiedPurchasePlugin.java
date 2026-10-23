package ro.addfame.app;

import android.webkit.WebView;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;

/**
 * Injects mobile/hide-verified-purchase.js before the first page script.
 *
 * load() runs from the bridge constructor, before WebView.loadUrl, so
 * addDocumentStartJavaScript covers the first document. The script file is
 * copied into assets by the Gradle task in app/build.gradle. If the file is
 * missing or the WebView rejects the script, this method returns and the
 * site loads normally.
 */
@CapacitorPlugin(name = "HideVerifiedPurchase")
public class HideVerifiedPurchasePlugin extends Plugin {

    static final String ASSET = "hide-verified-purchase.js";

    @Override
    public void load() {
        try {
            install();
        } catch (Throwable ignored) {
            // The live site must still open.
        }
    }

    private void install() {
        WebView webView = getBridge().getWebView();
        if (webView == null) return;
        final String script = readScript();
        if (script == null || script.length() == 0) return;

        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            Set<String> origins = new HashSet<>();
            origins.add("https://addfame.ro");
            origins.add("https://*.addfame.ro");
            try {
                WebViewCompat.addDocumentStartJavaScript(webView, script, origins);
            } catch (IllegalArgumentException ignored) {
                // Older WebView builds reject the origin rule. The post below still tries.
            }
        }

        // Idempotent backup when document-start scripts are unavailable.
        // The script no-ops on hosts other than addfame.ro.
        webView.post(() -> {
            try {
                webView.evaluateJavascript(script, null);
            } catch (Throwable ignored) {}
        });
    }

    private String readScript() {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(
            getContext().getAssets().open(ASSET), StandardCharsets.UTF_8))) {
            StringBuilder out = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                out.append(line).append('\n');
            }
            return out.toString();
        } catch (Exception ignored) {
            return null;
        }
    }
}
