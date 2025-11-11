#!/usr/bin/env python3
"""
Generate Enhanced Dashboard Data with AHFS Classifications
Creates JSON files for the enhanced medication dashboard including WHO ATC and AHFS categories
"""
import sqlite3
import json
from pathlib import Path

def generate_enhanced_dashboard_data():
    """Generate enhanced JSON data files for the dashboard"""

    db_path = "/Users/katymorrison/Desktop/Manual Library/1 PROJECTS/Medication_Research/data/atc_validation.db"
    output_dir = Path("/Users/katymorrison/Desktop/Manual Library/1 PROJECTS/Medication_Research/output/dashboard_data")
    output_dir.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    print("📊 Generating enhanced dashboard data...")

    # Get all medications with their classifications
    # Join with comprehensive_research to get the research reports
    cursor.execute("""
        SELECT
            m.id,
            m.active_moiety as name,
            m.formulary_status as status,
            m.formulary_rationale as rationale,
            m.topical_only,
            m.level4_code,
            m.level4_name,
            m.ahfs_primary_category as ahfs_category,
            m.who_mapping_type,
            m.who_mapping_notes,
            cr.full_research_report as full_research_report,
            COALESCE(cr.direct_natural_source, m.direct_natural_source) as direct_natural_source,
            COALESCE(cr.semi_synthetic_natural, m.semi_synthetic_natural) as semi_synthetic_natural,
            COALESCE(cr.structural_analog_natural, m.structural_analog_natural) as structural_analog_natural,
            COALESCE(cr.endogenous_compound, m.endogenous_compound) as endogenous_compound,
            COALESCE(cr.biosynthetic_product, m.biosynthetic_product) as biosynthetic_product,
            COALESCE(cr.works_natural_pathways, m.works_natural_pathways) as works_natural_pathways,
            COALESCE(cr.facilitates_natural_processes, m.facilitates_natural_processes) as facilitates_natural_processes,
            COALESCE(cr.no_natural_connection, m.no_natural_connection) as no_natural_connection
        FROM mapped_medications m
        LEFT JOIN comprehensive_research cr ON m.id = cr.mapped_medication_id
        ORDER BY m.active_moiety
    """)

    medications = [dict(row) for row in cursor.fetchall()]

    print(f"✅ Loaded {len(medications)} medications")

    # Create summary data (for table display)
    summary_data = []
    for med in medications:
        summary_data.append({
            'id': med['id'],
            'name': med['name'],
            'status': med['status'] or 'NEEDS_REVIEW',
            'topical_only': bool(med['topical_only']),
            'level4_code': med['level4_code'],
            'level4_name': med['level4_name'],
            'ahfs_category': med['ahfs_category'],
            'who_mapping_type': med['who_mapping_type'],
            'who_mapping_notes': med['who_mapping_notes']
        })

    # Create full data (for detailed reports)
    full_data = {}
    for med in medications:
        full_data[str(med['id'])] = {
            'id': med['id'],
            'name': med['name'],
            'status': med['status'] or 'NEEDS_REVIEW',
            'topical_only': bool(med['topical_only']),
            'rationale': med['rationale'],
            'classification': {
                'level4_code': med['level4_code'],
                'level4_name': med['level4_name']
            },
            'ahfs_category': med['ahfs_category'],
            'who_mapping_type': med['who_mapping_type'],
            'who_mapping_notes': med['who_mapping_notes'],
            'natural_connection': {
                'direct_natural_source': bool(med['direct_natural_source']),
                'semi_synthetic_natural': bool(med['semi_synthetic_natural']),
                'structural_analog_natural': bool(med['structural_analog_natural']),
                'endogenous_compound': bool(med['endogenous_compound']),
                'biosynthetic_product': bool(med['biosynthetic_product']),
                'works_natural_pathways': bool(med['works_natural_pathways']),
                'facilitates_natural_processes': bool(med['facilitates_natural_processes']),
                'no_natural_connection': bool(med['no_natural_connection'])
            },
            'full_report': med['full_research_report'] or ''
        }

    # Save summary data
    summary_file = output_dir / "medications-summary.json"
    with open(summary_file, 'w') as f:
        json.dump(summary_data, f, indent=2)
    print(f"✅ Saved summary data: {summary_file}")

    # Save full data
    full_file = output_dir / "medications-full.json"
    with open(full_file, 'w') as f:
        json.dump(full_data, f, indent=2)
    print(f"✅ Saved full data: {full_file}")

    # Get WHO Level 4 category research reports
    cursor.execute("""
        SELECT
            level4_code,
            level4_name,
            medication_count,
            category_description,
            therapeutic_purpose,
            common_mechanisms,
            typical_clinical_uses,
            predominantly_natural,
            predominantly_synthetic,
            mixed_natural_synthetic,
            natural_therapies_available,
            natural_alternatives_notes,
            category_status,
            naturopathic_considerations,
            safety_considerations,
            typical_naturopathic_applications,
            full_research_report,
            level1_code,
            level1_name,
            level2_code,
            level2_name,
            level3_code,
            level3_name
        FROM level4_category_research
        WHERE research_completed = 1
        ORDER BY level4_code
    """)

    category_reports = {}
    for row in cursor.fetchall():
        category_reports[row['level4_code']] = {
            'level4_code': row['level4_code'],
            'level4_name': row['level4_name'],
            'medication_count': row['medication_count'],
            'category_description': row['category_description'],
            'therapeutic_purpose': row['therapeutic_purpose'],
            'common_mechanisms': row['common_mechanisms'],
            'typical_clinical_uses': row['typical_clinical_uses'],
            'predominantly_natural': bool(row['predominantly_natural']),
            'predominantly_synthetic': bool(row['predominantly_synthetic']),
            'mixed_natural_synthetic': bool(row['mixed_natural_synthetic']),
            'natural_therapies_available': bool(row['natural_therapies_available']),
            'natural_alternatives_notes': row['natural_alternatives_notes'],
            'category_status': row['category_status'],
            'naturopathic_considerations': row['naturopathic_considerations'],
            'safety_considerations': row['safety_considerations'],
            'typical_naturopathic_applications': row['typical_naturopathic_applications'],
            'full_report': row['full_research_report'] or '',
            'level1_code': row['level1_code'],
            'level1_name': row['level1_name'],
            'level2_code': row['level2_code'],
            'level2_name': row['level2_name'],
            'level3_code': row['level3_code'],
            'level3_name': row['level3_name']
        }

    # Save WHO category reports
    category_file = output_dir / "who-category-reports.json"
    with open(category_file, 'w') as f:
        json.dump(category_reports, f, indent=2)
    print(f"✅ Saved WHO category reports: {category_file}")
    print(f"   {len(category_reports)} categories with research reports")

    # Generate statistics
    status_counts = {}
    atc_counts = {}
    ahfs_counts = {}

    for med in summary_data:
        # Status counts
        status = med['status']
        status_counts[status] = status_counts.get(status, 0) + 1

        # ATC counts
        if med['level4_code']:
            atc_counts[med['level4_code']] = atc_counts.get(med['level4_code'], 0) + 1

        # AHFS counts
        if med['ahfs_category']:
            # Extract base category name
            category = med['ahfs_category'].split(' - ')[1] if ' - ' in med['ahfs_category'] else med['ahfs_category']
            category = category.split(' - ')[0]  # Remove any additional parts
            ahfs_counts[category] = ahfs_counts.get(category, 0) + 1

    print("\n📈 Dashboard Statistics:")
    print("\nFormulary Status:")
    for status, count in sorted(status_counts.items()):
        print(f"  {status}: {count}")

    print(f"\nWHO ATC Level 4 Categories: {len(atc_counts)}")
    print(f"AHFS Therapeutic Classes: {len(ahfs_counts)}")

    print("\nTop 10 AHFS Categories:")
    for category, count in sorted(ahfs_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"  {category}: {count} medications")

    conn.close()

    print(f"\n✅ Enhanced dashboard data generated successfully!")
    print(f"📁 Output directory: {output_dir}")
    print(f"\n🌐 Open the dashboard:")
    print(f"   {output_dir / 'index_enhanced.html'}")

if __name__ == "__main__":
    generate_enhanced_dashboard_data()
