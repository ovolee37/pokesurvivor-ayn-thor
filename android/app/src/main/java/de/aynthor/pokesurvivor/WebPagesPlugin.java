package de.aynthor.pokesurvivor;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.util.Log;

import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Links from the game to the website's own pages (Settings > About: Guide & FAQ,
 * Pokédex, Contact, and the support pages) point to paths inside the app, like
 * "guia/". In the WebView they replaced the game with a broken page, and Back
 * could not leave it (it goes to the game, see MainActivity), so the app had to
 * be closed. Those links now open on pokesurvivor.com in the browser.
 *
 * Only the game itself (/, /index.html, /en/) stays in the app. Links to other
 * sites are already opened in the browser by Capacitor.
 */
@CapacitorPlugin(name = "WebPages")
public class WebPagesPlugin extends Plugin {

    private static final String SITE = "https://pokesurvivor.com";

    @Override
    public Boolean shouldOverrideLoad(Uri url) {
        Uri app = Uri.parse(getBridge().getAppUrl());
        if (!app.getHost().equals(url.getHost()) || !app.getScheme().equals(url.getScheme())) return null;
        String path = url.getPath() == null ? "/" : url.getPath();
        if (path.equals("/") || path.equals("/index.html") || path.equals("/en/") || path.equals("/en/index.html")) return null;

        Uri.Builder web = Uri.parse(SITE + path).buildUpon().encodedQuery(url.getEncodedQuery()).encodedFragment(url.getEncodedFragment());
        try {
            getActivity().startActivity(new Intent(Intent.ACTION_VIEW, web.build()));
        } catch (ActivityNotFoundException e) {
            Log.w("PokeSurvivor", "No browser for " + web.build());
        }
        return true;   // never load it in the app
    }
}
