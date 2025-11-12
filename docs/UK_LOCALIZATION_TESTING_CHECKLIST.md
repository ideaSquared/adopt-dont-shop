# UK Localization - Testing Checklist

## Pre-Deployment Testing Guide

Use this checklist to verify the UK localization implementation before deploying to production.

**Tester:** **\*\***\_\_\_**\*\***
**Date:** **\*\***\_\_\_**\*\***
**Environment:** **\*\***\_\_\_**\*\***

---

## 1. RescueProfileForm - Basic Information

### Organization Details

- [ ] "Rescue Name" field accepts text input
- [ ] "Rescue Type" dropdown includes "Rescue Organisation" (UK spelling)
- [ ] Email placeholder shows "contact@rescue.org.uk"
- [ ] Email accepts valid email addresses
- [ ] Phone placeholder shows "020 1234 5678" (UK format)
- [ ] Phone field accepts UK phone numbers
- [ ] Website placeholder shows "https://www.rescue.org.uk"
- [ ] Helper text says "enquiries" not "inquiries"

**Test Data:**

```
Name: Happy Paws Rescue
Type: Rescue Organisation
Email: contact@happypaws.org.uk
Phone: 020 7946 0958
Website: https://www.happypaws.org.uk
```

---

## 2. RescueProfileForm - Address Section

### Street Address

- [ ] Label reads "Street Address \*"
- [ ] Placeholder shows "123 High Street"
- [ ] Field is required
- [ ] Accepts text input

### Town/City

- [ ] Label reads "Town/City \*"
- [ ] Placeholder shows "London"
- [ ] Field is required
- [ ] Accepts text input

### County

- [ ] Label reads "County" (not "State")
- [ ] Field is **NOT** required (can be left blank)
- [ ] Placeholder shows "Greater London"
- [ ] Accepts text input

### Postcode

- [ ] Label reads "Postcode \*" (not "ZIP Code")
- [ ] Placeholder shows "SW1A 1AA"
- [ ] Field is required
- [ ] Helper text shows "UK postcode format"
- [ ] **Input auto-converts to UPPERCASE**
- [ ] Accepts valid UK postcode formats

**Test Postcodes:**

- [ ] `SW1A 1AA` (should accept)
- [ ] `M1 1AA` (should accept)
- [ ] `sw1a1aa` (should auto-convert to `SW1A 1AA`)
- [ ] `B33 8TH` (should accept)
- [ ] `12345` (should reject - US format)

### Country

- [ ] Label reads "Country \*"
- [ ] Default value is "United Kingdom"
- [ ] **United Kingdom appears first** in dropdown
- [ ] Dropdown includes: UK, Ireland, US, Canada, Australia, Other
- [ ] Field is required

**Test Data:**

```
Street: 10 Downing Street
City: London
County: Greater London
Postcode: SW1A 2AA
Country: United Kingdom
```

---

## 3. RescueProfileForm - Form Behavior

### Form Validation

- [ ] Cannot submit without required fields
- [ ] Required fields marked with \*
- [ ] County can be left blank
- [ ] Form shows validation errors

### Form Submission

- [ ] "Save Changes" button works
- [ ] Loading state shows "Saving..."
- [ ] Success message appears after save
- [ ] Error message shows if save fails

### Reset Functionality

- [ ] "Reset" button restores original values
- [ ] "Reset" button disabled when no changes
- [ ] "Reset" button enabled after making changes

---

## 4. AdoptionPolicyForm - Currency Display

### Fee Fields

- [ ] "Minimum Fee" label shows (£) symbol
- [ ] "Maximum Fee" label shows (£) symbol
- [ ] Both fields accept decimal numbers
- [ ] Fields accept values like 150.00
- [ ] Helper text mentions "adoption fees"

**Test Data:**

```
Minimum Fee: 50.00 (should save as £50.00)
Maximum Fee: 200.00 (should save as £200.00)
```

---

## 5. Data Persistence

### Save and Reload

- [ ] Save a rescue profile with UK address
- [ ] Refresh the page
- [ ] **All UK address fields load correctly**
- [ ] County value persists (if provided)
- [ ] Postcode displays in uppercase
- [ ] Country shows "United Kingdom"

### API Integration

- [ ] Check network tab - POST/PUT requests send correct data
- [ ] Verify response includes `postcode` and `county` fields
- [ ] Check backend logs - data saved to database correctly

---

## 6. Phone Number Testing

### Valid UK Numbers

Test these should be accepted:

- [ ] `020 7946 0958` (London landline)
- [ ] `07700 900123` (Mobile)
- [ ] `01234 567890` (Other landline)
- [ ] `+44 20 7946 0958` (International format)
- [ ] `02079460958` (No spaces - should format on display)

### Invalid Numbers

These should be rejected or flagged:

- [ ] `(555) 123-4567` (US format)
- [ ] `123` (Too short)

---

## 7. Postcode Testing

### Valid UK Postcodes

Test these should be accepted:

- [ ] `SW1A 1AA` (Westminster)
- [ ] `M1 1AA` (Manchester)
- [ ] `B33 8TH` (Birmingham)
- [ ] `CR2 6XH` (Croydon)
- [ ] `DN55 1PT` (Doncaster)
- [ ] `GIR 0AA` (Special)
- [ ] `EC1A 1BB` (City of London)

### Auto-Formatting

- [ ] Enter `sw1a1aa` → Should display as `SW1A 1AA`
- [ ] Enter `m1 1aa` → Should display as `M1 1AA`
- [ ] Enter `SW1A1AA` → Should display as `SW1A 1AA` (add space)

### Invalid Postcodes

These should be rejected:

- [ ] `12345` (US ZIP)
- [ ] `ABC` (Too short)
- [ ] `AAAA AAAA` (Invalid format)

---

## 8. UK English Spelling

### Check These Terms

- [ ] "Organisation" not "Organization"
- [ ] "Enquiries" not "Inquiries"
- [ ] "Postcode" not "ZIP Code"
- [ ] "County" not "State"
- [ ] "Town/City" not just "City"

---

## 9. Country Dropdown Order

### Verify Order

1. [ ] United Kingdom (first)
2. [ ] Ireland
3. [ ] United States
4. [ ] Canada
5. [ ] Australia
6. [ ] Other (last)

---

## 10. Edge Cases

### Empty County Field

- [ ] Leave county blank
- [ ] Save form
- [ ] **Form saves successfully** (county is optional)
- [ ] Reload page - county remains empty (not showing error)

### Special Characters in Address

- [ ] Enter address with apostrophe: "St. Mary's Road"
- [ ] Enter address with hyphen: "Stoke-on-Trent"
- [ ] **Should save correctly**

### Long Address Values

- [ ] Enter very long street name (100+ chars)
- [ ] Enter very long city name (50+ chars)
- [ ] Check field truncation/scrolling works

---

## 11. Backend Compatibility

### Database Field Mapping

- [ ] Check database - verify `county` value stored in `state` column
- [ ] Check database - verify `postcode` value stored in `zip_code` column
- [ ] Verify existing data still loads (backward compatibility)

### API Responses

- [ ] GET /api/rescues/:id returns `postcode` field
- [ ] GET /api/rescues/:id returns `county` field
- [ ] POST/PUT accepts new field names
- [ ] Response doesn't include old `state`/`zipCode` fields

---

## 12. TypeScript Compilation

### Build Check

```bash
cd app.rescue
npm run type-check
```

- [ ] No TypeScript errors
- [ ] No warnings about `state` or `zipCode`
- [ ] All imports resolve correctly

---

## 13. Cross-Browser Testing

Test in:

- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

Verify:

- [ ] Forms display correctly
- [ ] Postcode auto-uppercase works
- [ ] Dropdowns function properly
- [ ] Validation messages show

---

## 14. Mobile Testing

### Responsive Design

- [ ] Forms are usable on mobile (iPhone/Android)
- [ ] Input fields don't cause horizontal scroll
- [ ] Dropdown menus work on touch devices
- [ ] Postcode keyboard shows on mobile

---

## 15. Accessibility

### Keyboard Navigation

- [ ] Can tab through all form fields
- [ ] Required fields indicated for screen readers
- [ ] Error messages announced properly

### Screen Reader

- [ ] Field labels read correctly
- [ ] Helper text is associated with inputs
- [ ] Error messages read aloud

---

## 16. Performance

### Load Time

- [ ] Form loads quickly (<2 seconds)
- [ ] No lag when typing in postcode field
- [ ] Dropdown opens immediately
- [ ] Save operation completes in reasonable time

---

## Common Issues to Watch For

### ❌ Known Issues to Check

- [ ] Postcode doesn't auto-uppercase → Check onChange handler
- [ ] County field required → Should be optional
- [ ] "State" or "ZIP Code" still visible → Check labels
- [ ] TypeScript errors about old fields → Check type definitions
- [ ] Form doesn't save → Check API endpoint compatibility

---

## Sign-Off

### Testing Complete

- [ ] All critical tests passed
- [ ] No blocking issues found
- [ ] Ready for production deployment

**Tester Signature:** **\*\***\_\_\_**\*\***
**Date:** **\*\***\_\_\_**\*\***

### Issues Found

| Issue | Severity | Status |
| ----- | -------- | ------ |
|       |          |        |
|       |          |        |
|       |          |        |

**Notes:**

```
[Add any additional notes here]
```

---

## Quick Test Script

For rapid testing, use this complete rescue profile:

```json
{
  "name": "Test Rescue UK",
  "rescue_type": "rescue_organization",
  "email": "test@testrescue.org.uk",
  "phone": "020 7946 0958",
  "website": "https://www.testrescue.org.uk",
  "description": "A test rescue organisation for UK localization testing",
  "address": {
    "street": "10 Downing Street",
    "city": "London",
    "county": "Greater London",
    "postcode": "SW1A 2AA",
    "country": "United Kingdom"
  }
}
```

**Expected behavior:**

1. All fields populate correctly
2. Postcode displays in uppercase: `SW1A 2AA`
3. County field is optional and shows "Greater London"
4. Phone displays formatted: `020 7946 0958`
5. Form saves successfully
6. Reload shows all data correctly

---

**Last Updated:** January 2025
