# FEDUSA scanner camera fix

- Added the html5-qrcode scanner library.
- Added a real camera/video reader behind the existing scanner overlay.
- Starts the rear-facing camera after selecting Congress or Voting mode.
- Stops the camera after a scan, when returning, or when the page is hidden.
- Restarts the camera when Scan Next is selected.
- Keeps manual badge entry available.
- Adds clear errors for HTTPS, permission, missing-camera and library-loading problems.

Test on the deployed HTTPS Netlify URL. Android Chrome must have Camera permission enabled for the site.
