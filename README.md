# Medication Research Dashboard

## Overview

This directory contains two interactive HTML dashboards for viewing medication research data:

1. **`index.html`** - Original dashboard with WHO ATC Level 4 classifications
2. **`index_enhanced.html`** - Enhanced dashboard with both WHO ATC and AHFS classifications ⭐ **NEW**

## Enhanced Dashboard Features

The enhanced dashboard (`index_enhanced.html`) includes:

### 🔍 Advanced Filtering
- **Formulary Status**: Filter by ALLOWED, NOT_ALLOWED, TARGET_FOR_MODERNIZATION, DISCONTINUED, etc.
- **WHO ATC Level 4 Categories**: Filter by WHO Anatomical Therapeutic Chemical classification (554 categories)
- **AHFS Therapeutic Classes**: Filter by American Hospital Formulary Service classification (301 categories)

### 📊 Comprehensive Classifications Display
Each medication shows:
- **WHO ATC Code & Name**: e.g., `A10BA - Biguanides`
- **AHFS Category**: e.g., `68:20 - Antidiabetic Agents`
- Both classifications are **clickable** to view all medications in that category

### 🔗 Interactive Category Views
Click on any classification to see:
- Category overview and medication count
- Medications grouped by formulary status
- Direct links to individual medication reports

### 📑 Enhanced Medication Reports
Individual medication reports display:
- Formulary status badge
- WHO ATC and AHFS classifications side-by-side
- Natural connection profile with colored badges
- Full research report with formatted evidence categories

## Data Files

- **`medications-summary.json`** - Summary data for table display (lightweight)
- **`medications-full.json`** - Complete medication data including full research reports
- **`dashboard.js`** - JavaScript for original dashboard
- **`dashboard_enhanced.js`** - JavaScript for enhanced dashboard

## Regenerating Data

To update the dashboard data after database changes:

```bash
cd "/Users/katymorrison/Desktop/Manual Library/1 PROJECTS/Medication_Research"
venv/bin/python3 scripts/html_generation/generate_enhanced_dashboard_data.py
```

## Statistics (as of last generation)

- **Total Medications**: 2,266
- **Formulary Status Breakdown**:
  - ALLOWED: 337
  - TARGET_FOR_MODERNIZATION: 1,517
  - NOT_ALLOWED: 294
  - DISCONTINUED: 118

- **Classifications**:
  - WHO ATC Level 4 Categories: 554
  - AHFS Therapeutic Classes: 301
  - AHFS Match Status: 1,371 medications (91.4% EXACT matches)

## Recent Database Improvements (October 2025)

### Natural Connection Classifications
- ✅ All 2,266 medications now have proper natural connection flags
- ✅ Removed contradictory "no natural connection" flags (all medications interact with biological systems)
- ✅ Fixed 252 October 2025 research reports with missing flags

### Classification System Refinements
- ✅ Separated WHO validation data from AHFS validation data into proper fields
- ✅ Set ATC levels based on code length for 1,532 medications
- ✅ Consolidated AHFS match status categories (CATEGORY_ASSIGNED → EXACT)
- ✅ Assigned WHO codes to previously unmatched medications (Omega-3-acid Ethyl Esters, Yttrium-90 Ibritumomab tiuxetan)

### Data Integrity
- ✅ Synchronized mapped_medications and comprehensive_research tables (2,266 medications in each)
- ✅ Implemented validation rules for mutually exclusive flags
- ✅ Complete WHO mapping types for 2,255 medications (99.5%)

## Usage

Simply open `index_enhanced.html` in your web browser:

```bash
open "/Users/katymorrison/Desktop/Manual Library/1 PROJECTS/Medication_Research/output/dashboard_data/index_enhanced.html"
```

---

Generated: October 2025
