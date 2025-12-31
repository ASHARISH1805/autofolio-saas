# Portfolio Updates - Certificate Modal & Action Buttons

## Changes Implemented ✅

### 1. Removed Code Window Image
- ✅ Removed the `ai_model.py` code window from the hero section
- Portfolio hero section is now cleaner and focuses on the text content

### 2. Added Action Buttons to Cards

#### Certifications (View Certificate only)
All certification cards now have:
- ✅ **View Certificate** button (primary purple button)
- Clicking opens a modal popup with certificate details and image

Certifications with buttons:
- Quantum Hardware Technologies & Challenges
- Quantum Fundamentals and Advanced Algorithms (QC101)
- AI/ML for Geodata Analysis  
- Power BI
- SQL for Data Science
- C Programming

#### Hackathons/Achievements (GitHub Code + View Certificate)
Hackathon cards now have:
- ✅ **GitHub Code** button (secondary button with GitHub icon)
- ✅ **View Certificate** button (primary purple button)

Hackathons with buttons:
- MIT iQuHACK 2026 (Remote)
- Smart India Hackathon 2024
- MSME IDEA Hackathon 2024

#### Internships (GitHub Code + View Certificate)
Internship timeline items now have:
- ✅ **GitHub Code** button
- ✅ **View Certificate** button

Internships with buttons:
- Machine Learning Intern (CodingMissions IT Solutions)
- AI-ML-DS Intern (IIDT & Blackbuck Engineers)

### 3. Modal Popup System
- ✅ Beautiful modal popup for viewing certificates
- ✅ Displays certificate image (if available)
- ✅ Shows title, issuer, date, and description
- ✅ Close options: X button, click outside, or press ESC key
- ✅ Smooth fade-in and slide-up animations
- ✅ Fully responsive on all devices

### 4. Button Styling
- ✅ Primary buttons: Purple gradient background
- ✅ Secondary buttons: Border style with hover effects
- ✅ Hover animations: Lift effect on primary, color change on secondary
- ✅ Icons included: Certificate icon, GitHub icon
- ✅ Responsive: Buttons stack vertically on mobile

## How to Add Certificate Images

Each card has a `data-certificate-image` attribute where you can specify the certificate image path:

```html
<!-- Example for a certification -->
<div class="cert-card" data-certificate-image="certificates/quantum-hardware-cert.jpg">
    ...
</div>

<!-- Example for a hackathon -->
<div class="achievement-card" data-certificate-image="certificates/iquback-cert.jpg">
    ...
</div>

<!-- Example for an internship -->
<div class="timeline-item" data-certificate-image="certificates/ml-internship-cert.jpg">
    ...
</div>
```

### Folder Structure
```
Harish Portfolio/
├── certificates/           ← Create this folder
│   ├── quantum-hardware-cert.jpg
│   ├── quantum-fundamentals-cert.jpg
│   ├── ai-ml-geodata-cert.jpg
│   ├── powerbi-cert.jpg
│   ├── sql-cert.jpg
│   ├── c-programming-cert.jpg
│   ├── iquback-cert.jpg
│   ├── sih-2024-cert.jpg
│   └── msme-cert.jpg
```

## GitHub Links

All "GitHub Code" buttons currently link to: `https://github.com/asharish1805`

To customize for specific projects:
1. Find the `<a href="https://github.com/asharish1805"` in the HTML
2. Change the URL to point to the specific project repository
3. Example: `https://github.com/asharish1805/quantum-project`

## Features Summary

✨ **User Experience**
- Clean, professional design
- Intuitive button placement
- Smooth animations
- Mobile-friendly
- Keyboard accessible (ESC to close modal)

🎨 **Visual Design**  
- Consistent purple/gradient theme
- Clear visual hierarchy
- Professional button styling
- Hover effects for interactivity

📱 **Responsive**
- Buttons stack on mobile
- Modal adapts to screen size
- Touch-friendly button sizes

## Testing Checklist

- [ ] Test "View Certificate" on all certification cards
- [ ] Test "GitHub Code" + "View Certificate" on hackathons
- [ ] Test "GitHub Code" + "View Certificate" on internships  
- [ ] Test modal close with X button
- [ ] Test modal close by clicking outside
- [ ] Test modal close with ESC key
- [ ] Test on mobile devices
- [ ] Add certificate images to the `certificates/` folder
- [ ] Update GitHub links to point to specific project repos

## Next Steps

1. **Create `certificates/` folder** in your portfolio directory
2. **Add certificate images** (JPG/PNG format, ~1200px wide recommended)
3. **Update GitHub links** to point to your actual project repositories
4. **Test the modal** by clicking View Certificate buttons
5. **Verify responsiveness** on different screen sizes

---

**All features are now implemented and ready to use!** 🎉
