# How to Add Image Gallery Section to Shopify

## Quick Setup Guide

### Step 1: Upload the File to Your Shopify Theme

1. **Login to Shopify Admin**
   - Go to your Shopify admin panel
   - Navigate to **Online Store** > **Themes**

2. **Access Theme Files**
   - Click on your active theme (or the theme you want to customize)
   - Click **"..."** (three dots) button
   - Select **"Edit code"**

3. **Upload to Sections Folder**
   - In the left sidebar, find and open the `sections` folder
   - Click **"Add a new section"** or **"Upload a section"** (if available)
   - Upload the `image-grid.liquid` file
   - OR if you're copying the code:
     - Click **"Add a new section"**
     - Name it: `image-grid.liquid`
     - Paste all the code from the file
     - Click **"Save"**

### Step 2: Add the Section to Your Theme

1. **Open Theme Customizer**
   - Go back to **Online Store** > **Themes**
   - Click **"Customize"** on your active theme

2. **Add the Section**
   - Scroll down and click **"Add section"** button
   - Look for **"Image Gallery"** in the list
   - Click on it to add it to your page

3. **Upload Images**
   - Once the section is added, click on it to open settings
   - Click **"Add image"** or **"Add block"** button
   - Upload your images (up to 50 images)
   - Arrange the order by dragging the blocks
   - Click **"Save"** when done

### Step 3: Customize Settings (Optional)

- **Section Title**: Change the default "Image Gallery" text if needed
- **Reorder Images**: Drag blocks to reorder them
- **Delete Images**: Click the trash icon on any image block

## Features of the Gallery

✅ **Responsive Design** - Works perfectly on mobile, tablet, and desktop  
✅ **Image Lightbox** - Click any image to view it full-size  
✅ **Keyboard Navigation** - Use arrow keys to navigate, ESC to close  
✅ **Touch Support** - Swipe on mobile devices  
✅ **Image Counter** - Shows current image position  
✅ **Smooth Animations** - Beautiful hover and transition effects  
✅ **Up to 50 Images** - Add as many images as you need  

## Troubleshooting

### Section Not Showing in Customizer?

1. Make sure the file is named exactly `image-grid.liquid` (case-sensitive)
2. Verify the file is in the `sections` folder
3. Refresh the customizer page
4. Check that there are no syntax errors in the code

### Images Not Displaying?

1. Make sure images are uploaded through the theme customizer
2. Check image file formats (JPG, PNG, GIF, WebP work best)
3. Try uploading smaller images if they're too large
4. Clear your browser cache and refresh

### Gallery Looks Wrong?

1. Check that your theme's CSS doesn't conflict
2. Make sure the file wasn't corrupted during upload
3. Try re-uploading the file

## File Locations Summary

```
Your Shopify Theme/
└── sections/
    └── image-grid.liquid     ← Upload this file here
```

## Support

If you need help, check:
- Shopify documentation: https://shopify.dev/themes
- Section schema: https://shopify.dev/docs/themes/sections/schema

---

**Note**: This section requires a Shopify theme to work properly. It cannot be used as a standalone HTML file.
