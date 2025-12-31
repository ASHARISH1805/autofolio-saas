# Certificate & Achievement Modal Feature

## Overview
Your portfolio now has an interactive modal popup feature! When visitors click on any certificate or achievement card, a beautiful modal will appear showing the full details and certificate image (if available).

## How It Works

### Current Features ✨
- **Click to View**: Click any certificate or achievement card to open a popup
- **Full Details**: Displays title, issuer, date, and description
- **Certificate Images**: Can display certificate/achievement images
- **Easy Close**: Close by clicking:
  - The X button (top right)
  - The dark overlay (background)
  - Pressing the ESC key
- **Smooth Animations**: Fade-in/slide-up effects
- **Responsive**: Works on all devices
- **Visual Indicator**: "👁️ Click to view" appears on hover

## Adding Certificate Images

To display an actual certificate image in the modal, add the `data-certificate-image` attribute to your certificate or achievement cards.

### Example for Certificates:

```html
<div class="cert-card" data-certificate-image="certificates/quantum-certificate.jpg">
    <div class="cert-icon">
        <i class="fas fa-atom"></i>
    </div>
    <h4>Quantum Hardware Technologies & Challenges</h4>
    <p class="cert-issuer">QuEdX TalkOn</p>
    <p class="cert-date">Jan 2026</p>
</div>
```

### Example for Achievements:

```html
<div class="achievement-card" data-certificate-image="certificates/iquback-certificate.jpg">
    <div class="achievement-icon">
        <i class="fas fa-atom"></i>
    </div>
    <h3>MIT iQuHACK 2026 (Remote)</h3>
    <p class="achievement-position">Selected Participant</p>
    <p class="achievement-description">
        Worked on quantum computing challenges...
    </p>
</div>
```

## Organizing Certificate Images

### Recommended Folder Structure:
```
Harish Portfolio/
├── index.html
├── styles.css
├── script.js
├── certificates/          ← Create this folder
│   ├── quantum-hardware-cert.jpg
│   ├── quantum-fundamentals-cert.jpg
│   ├── iquback-certificate.jpg
│   ├── sih-2024-certificate.jpg
│   ├── ai-ml-geodata-cert.jpg
│   └── ... (other certificates)
```

### Image Guidelines:
- **Format**: JPG, PNG, or WebP
- **Size**: Recommended 1200px wide (will auto-scale)
- **File Size**: Keep under 500KB for fast loading
- **Naming**: Use descriptive names (e.g., `quantum-cert-2026.jpg`)

## Adding a Certificate Image - Step by Step

1. **Save your certificate image** to the `certificates` folder
2. **Open `index.html`**
3. **Find the certificate card** you want to add an image to
4. **Add the attribute**: `data-certificate-image="certificates/your-image.jpg"`

Example:
```html
<!-- Before -->
<div class="cert-card">
    <h4>Power BI</h4>
    ...
</div>

<!-- After -->
<div class="cert-card" data-certificate-image="certificates/powerbi-cert.jpg">
    <h4>Power BI</h4>
    ...
</div>
```

## Without Images

If no image is provided, the modal will still work and show:
- Certificate/Achievement title
- Issuer/Position
- Date
- Description

## Customization Options

### Change Modal Descriptions

Currently, all certificates show a default description. To customize, edit `script.js` line ~481:

```javascript
// Change this line to customize descriptions per certificate
description: 'Building strong foundations in quantum computing principles...',
```

You can make it dynamic by adding a `data-description` attribute to each card.

### Styling

Modal styles can be customized in `styles.css` under the section:
```css
/* ===================================
   Certificate/Achievement Modal
   =================================== */
```

## Testing

1. Open your portfolio in a browser
2. Scroll to Certifications or Achievements section
3. Hover over any card → "👁️ Click to view" should appear
4. Click the card → Modal should open
5. Try closing with X button, ESC key, or clicking outside

## Browser Support
- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers

## Troubleshooting

### Modal doesn't open?
- Check browser console for errors (F12)
- Ensure `script.js` is loading properly

### Image doesn't show?
- Verify the image path is correct
- Check if image file exists in the specified folder
- Check browser console for 404 errors

### Image too large/small?
- Modal auto-scales images (max 600px height)
- Adjust in `styles.css` → `.modal-image { max-height: 600px; }`

## Future Enhancements

You can extend this feature by:
- Adding a download button for certificates
- Creating a gallery view for multiple certificate images
- Adding verification links
- Including credential IDs

---

**Tip**: Start by adding images to your most important certificates (quantum certifications, ISRO, etc.) and gradually add others!
