# Medication Research Dashboard

An interactive web-based dashboard for exploring FDA medications with WHO ATC and AHFS classifications, focusing on natural connections and naturopathic formulary evaluation.

## 🌐 Live Dashboard

**[View Dashboard](https://yourusername.github.io/medication-research-dashboard/)**

## 📊 Features

### Comprehensive Medication Database
- **2,268 FDA medications** with detailed research reports
- **WHO ATC Level 4 classifications** (554 categories)
- **AHFS Therapeutic Classes** (301 categories)
- Natural connection profiles for each medication

### Interactive Filtering
- Filter by formulary status (Allowed, Not Allowed, Target for Modernization, Discontinued)
- Filter by WHO ATC Level 4 categories
- Filter by AHFS therapeutic classes
- Full-text search across all medications

### Dual View Modes
1. **Medications View** - Browse individual medications with classifications
2. **WHO ATC Categories View** - Explore therapeutic categories with full hierarchy (Level 1→2→3→4)

### Detailed Reports
- **Medication Reports**: Natural derivation, mechanism, safety profile, integration potential
- **Category Reports**: Therapeutic purpose, common mechanisms, naturopathic considerations
- **Natural Connection Profiles**: 8 evidence categories with colored badges

## 📈 Statistics

- **Formulary Status Breakdown**:
  - ALLOWED: 337 medications
  - TARGET_FOR_MODERNIZATION: 1,519 medications
  - NOT_ALLOWED: 294 medications
  - DISCONTINUED: 118 medications

- **Classifications**:
  - 554 WHO ATC Level 4 categories
  - 301 AHFS therapeutic classes

## 🔍 Evidence Categories

Medications are evaluated across 8 natural connection categories:
- ✓ Direct Natural Source
- ✓ Semi-Synthetic from Natural
- ✓ Structural Analog of Natural
- ✓ Endogenous Compound
- ✓ Biosynthetic Product
- ✓ Works via Natural Pathways
- ✓ Facilitates Natural Processes
- ✓ No Natural Connection

## 🛠️ Technical Details

### Built With
- Pure HTML/CSS/JavaScript (no build process required)
- [DataTables](https://datatables.net/) for interactive tables
- [Marked.js](https://marked.js.org/) for markdown rendering
- Responsive design for desktop and mobile

### Data Format
- `medications-summary.json` - Summary data for table display (~500KB)
- `medications-full.json` - Complete medication data with full reports (~8MB)
- `who-category-reports.json` - WHO ATC category research (~2MB)

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- JavaScript required
- No server-side processing needed

## 📝 About the Research

This dashboard presents research on FDA-approved medications analyzed from a naturopathic medicine perspective. Each medication has been evaluated for:

- **Natural Connection**: Origin and relationship to natural compounds
- **Mechanism of Action**: How the medication works in the body
- **Safety Profile**: Known risks and considerations
- **Integration Potential**: Compatibility with naturopathic practice

The research uses WHO ATC (Anatomical Therapeutic Chemical) classification for international standardization and AHFS (American Hospital Formulary Service) for therapeutic categorization.

## 🔄 Updates

Dashboard data is periodically updated as new research is completed. Last update: October 2025

## 📧 Contact

For questions about the research or to report issues:
- Create an issue in this repository
- Contact: [your email or contact method]

## 📜 License

Data compiled from FDA public databases and WHO ATC classification system.
Dashboard code: MIT License

## 🙏 Acknowledgments

- FDA for medication data
- WHO for ATC classification system
- AHFS for therapeutic categorization

---

*This dashboard is for informational and research purposes. Medication decisions should be made in consultation with qualified healthcare providers.*
