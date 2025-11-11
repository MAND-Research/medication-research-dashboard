// Enhanced Medication Research Dashboard JavaScript
console.log('Enhanced Dashboard JavaScript loaded');

// Configure marked.js for better markdown parsing
marked.setOptions({
    breaks: true,        // Convert single line breaks to <br>
    gfm: true,          // GitHub Flavored Markdown
    headerIds: true,
    mangle: false,
    sanitize: false
});

let summaryData = [];
let fullDataCache = {};
let categoryReportsCache = null;
let dataTable = null;
let categoriesTable = null;
let currentView = 'medications';

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - starting initialization');
    loadSummaryData();
    setupModals();
});

// Load summary data for table
async function loadSummaryData() {
    try {
        console.log('Loading summary data...');
        const response = await fetch('medications-summary.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        summaryData = await response.json();
        console.log('Data loaded:', summaryData.length, 'medications');

        console.log('Populating filters...');
        populateATCFilter();
        populateAHFSFilter();

        console.log('Initializing table...');
        initializeTable();

        console.log('Setting up filters...');
        setupFilters();

        document.getElementById('loading').style.display = 'none';
        document.getElementById('medications-table').style.display = 'table';
        console.log('Dashboard loaded successfully');
    } catch (error) {
        console.error('Error loading data:', error);
        console.error('Error stack:', error.stack);
        const loadingEl = document.getElementById('loading');
        const errorEl = document.getElementById('error');
        if (loadingEl) loadingEl.style.display = 'none';
        if (errorEl) {
            errorEl.textContent = 'Error loading medication data: ' + error.message;
            errorEl.style.display = 'block';
        }
    }
}

// Populate WHO ATC Level 4 filter dropdown
function populateATCFilter() {
    const atcCategories = new Map();

    summaryData.forEach(med => {
        if (med.level4_code && med.level4_name) {
            const key = `${med.level4_code} - ${med.level4_name}`;
            atcCategories.set(med.level4_code, key);
        }
    });

    const select = document.getElementById('atc-filter');
    const sortedCategories = Array.from(atcCategories.entries())
        .sort((a, b) => a[0].localeCompare(b[0]));

    sortedCategories.forEach(([code, display]) => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = display;
        select.appendChild(option);
    });

    console.log('ATC filter populated with', sortedCategories.length, 'categories');
}

// Populate AHFS filter dropdown
function populateAHFSFilter() {
    const ahfsCategories = new Map();

    summaryData.forEach(med => {
        if (med.ahfs_category) {
            // Extract the category name (before the hyphen and numbers)
            const categoryMatch = med.ahfs_category.match(/^(.*?)\s*-\s*\d/);
            if (categoryMatch) {
                const categoryName = categoryMatch[1].trim();
                ahfsCategories.set(categoryName, categoryName);
            }
        }
    });

    const select = document.getElementById('ahfs-filter');
    const sortedCategories = Array.from(ahfsCategories.values())
        .sort((a, b) => a.localeCompare(b));

    sortedCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    });

    console.log('AHFS filter populated with', sortedCategories.length, 'categories');
}

// Initialize DataTable
function initializeTable() {
    dataTable = $('#medications-table').DataTable({
        data: summaryData,
        columns: [
            {
                data: 'name',
                width: '25%',
                render: function(data, type, row) {
                    let html = '<strong>' + data.toUpperCase() + '</strong>';
                    html += '<br><button class="btn-view" onclick="viewMedicationReport(' +
                           row.id + ')" style="margin-top: 0.5rem;">View Report</button>';
                    return html;
                }
            },
            {
                data: 'status',
                width: '15%',
                render: function(data, type, row) {
                    let html = '<span class="status-badge status-' + data + '">' +
                           data.replace(/_/g, ' ') + '</span>';

                    // Add TOPICAL ONLY badge if applicable
                    if (row.topical_only) {
                        html += '<br><span class="status-badge status-TOPICAL_ONLY" style="margin-top: 0.5rem;">TOPICAL ONLY</span>';
                    }

                    return html;
                }
            },
            {
                data: null,
                width: '30%',
                render: function(data, type, row) {
                    let html = '';

                    // WHO ATC Classification
                    if (row.level4_code && row.level4_name) {
                        // Get mapping badge
                        const mappingInfo = generateWHOMappingBadge(row.who_mapping_type, row.who_mapping_notes);

                        // Determine pill color based on mapping type
                        let pillClass = 'atc-code';
                        if (row.who_mapping_type === 'approximation') {
                            pillClass = 'atc-code atc-code-approximation';
                        } else if (row.who_mapping_type === 'not_in_who') {
                            pillClass = 'atc-code atc-code-not-in-who';
                        } else if (row.who_mapping_type === 'combination_component') {
                            pillClass = 'atc-code atc-code-combination';
                        }

                        html += '<span class="' + pillClass + '">' + row.level4_code + '</span> ';

                        // Add mapping badge if present
                        if (mappingInfo.badge) {
                            html += mappingInfo.badge + ' ';
                        }

                        html += '<a href="#" class="classification-link" onclick="viewWHOCategory(\'' +
                               row.level4_code + '\', \'' + escapeHtml(row.level4_name) + '\'); return false;" ' +
                               'style="display: inline;">' +
                               row.level4_name.toUpperCase() + '</a>';

                        // Add explanation text below if there's a mapping note
                        if (mappingInfo.explanation) {
                            html += '<br>' + mappingInfo.explanation;
                        }
                    } else if (row.who_mapping_type === 'not_in_who') {
                        // No code assigned but we know why
                        const mappingInfo = generateWHOMappingBadge(row.who_mapping_type, row.who_mapping_notes);
                        html = '<span style="color: #999;">Not in WHO Database</span>';
                        if (mappingInfo.explanation) {
                            html += '<br>' + mappingInfo.explanation;
                        }
                    } else {
                        html = '<span style="color: #999;">Not classified</span>';
                    }

                    return html;
                }
            },
            {
                data: null,
                width: '30%',
                render: function(data, type, row) {
                    let html = '';

                    // AHFS Classification
                    if (row.ahfs_category) {
                        const parts = row.ahfs_category.split(' - ');
                        html += '<span class="ahfs-code">' + parts[0] + '</span> ';
                        html += '<a href="#" class="classification-link" onclick="viewAHFSCategory(\'' +
                               escapeHtml(row.ahfs_category) + '\'); return false;" style="display: inline;">' +
                               parts[1].split(' - ')[0].toUpperCase() + '</a>';
                    } else {
                        html = '<span style="color: #999;">Not classified</span>';
                    }

                    return html;
                }
            }
        ],
        autoWidth: false,
        pageLength: 25,
        lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
        order: [[0, 'asc']],
        dom: '<"top"lf>rt<"bottom"ip><"clear">',
        language: {
            search: "Search medications:",
            lengthMenu: "Show _MENU_ medications",
            info: "Showing _START_ to _END_ of _TOTAL_ medications",
            infoFiltered: "(filtered from _MAX_ total medications)"
        }
    });
}

// Generate WHO mapping badge based on mapping type
function generateWHOMappingBadge(mappingType, mappingNotes) {
    if (!mappingType || mappingType === 'exact' || mappingType === 'corrected_direct_match') {
        // High confidence - no badge needed
        return {
            badge: '',
            explanation: '',
            tooltipText: ''
        };
    }

    if (mappingType === 'name_variant') {
        // Medium confidence - name differs but code is correct
        const tooltip = 'Name Variant: US/FDA name differs from WHO international name, but the WHO code and category are clinically accurate.';
        const explanation = '<span style="color: #3b82f6; font-size: 0.8rem;">※ Name Variant: ' +
                          (mappingNotes || 'US/FDA name differs from WHO international name') + '</span>';
        return {
            badge: '<span class="mapping-badge badge-name-variant" title="' + escapeHtml(tooltip) + '">※</span>',
            explanation: explanation,
            tooltipText: tooltip
        };
    }

    if (mappingType === 'approximation') {
        // Low confidence - category level mapping
        const tooltip = 'Category-Level Mapping: This medication is mapped to a general therapeutic category. A specific WHO substance code may not exist.';
        const explanation = '<span style="color: #f59e0b; font-size: 0.8rem;">⚠ Approximation: ' +
                          (mappingNotes || 'Mapped to category level; specific substance code may not exist') + '</span>';
        return {
            badge: '<span class="mapping-badge badge-approximation" title="' + escapeHtml(tooltip) + '">⚠</span>',
            explanation: explanation,
            tooltipText: tooltip
        };
    }

    if (mappingType === 'combination_component') {
        const tooltip = 'Combination Component: This substance is used only as a component in combination products.';
        const explanation = '<span style="color: #8b5cf6; font-size: 0.8rem;">C Combination Component: ' +
                          (mappingNotes || 'Used only in combination products') + '</span>';
        return {
            badge: '<span class="mapping-badge badge-combination" title="' + escapeHtml(tooltip) + '">C</span>',
            explanation: explanation,
            tooltipText: tooltip
        };
    }

    if (mappingType === 'not_in_who') {
        const tooltip = 'Not in WHO Database: This medication is not found in the WHO ATC classification system (may be discontinued or regional).';
        const explanation = '<span style="color: #6b7280; font-size: 0.8rem;">⊘ Not in WHO: ' +
                          (mappingNotes || 'Not found in WHO ATC classification system') + '</span>';
        return {
            badge: '<span class="mapping-badge badge-not-in-who" title="' + escapeHtml(tooltip) + '">⊘</span>',
            explanation: explanation,
            tooltipText: tooltip
        };
    }

    // Unknown mapping type
    const tooltip = 'Unknown Mapping: ' + (mappingNotes || 'Mapping information unavailable');
    return {
        badge: '<span class="mapping-badge badge-unknown" title="' + escapeHtml(tooltip) + '">?</span>',
        explanation: '<span style="color: #dc2626; font-size: 0.8rem;">? Unknown: ' + (mappingNotes || 'Mapping information unavailable') + '</span>',
        tooltipText: tooltip
    };
}

// View full report for a medication
async function viewMedicationReport(medicationId) {
    const modal = document.getElementById('report-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');

    // Show modal
    modal.style.display = 'block';

    // Get medication name from summary data
    const medication = summaryData.find(m => m.id === medicationId);
    if (!medication) {
        modalBody.innerHTML = '<p class="error">Medication not found.</p>';
        return;
    }

    modalTitle.textContent = medication.name + ' - Research Report';
    modalBody.innerHTML = '<div class="loading">Loading full report...</div>';

    try {
        // Check if full data is already loaded
        if (Object.keys(fullDataCache).length === 0) {
            const response = await fetch('medications-full.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            fullDataCache = await response.json();
        }

        // Get the specific medication's full data
        const fullData = fullDataCache[medicationId.toString()];
        if (!fullData) {
            throw new Error('Medication data not found');
        }

        // Render the report
        renderMedicationReport(fullData, modalBody);

    } catch (error) {
        console.error('Error loading report:', error);
        modalBody.innerHTML = '<p class="error">Error loading report: ' + error.message + '</p>';
    }
}

// View WHO ATC Level 4 category report
async function viewWHOCategory(atcCode, atcName) {
    const modal = document.getElementById('category-modal');
    const modalTitle = document.getElementById('category-modal-title');
    const modalBody = document.getElementById('category-modal-body');

    // Show modal
    modal.style.display = 'block';
    modalTitle.textContent = `WHO Category: ${atcCode} - ${atcName}`;
    modalBody.innerHTML = '<div class="loading">Loading category research report...</div>';

    try {
        // Load category reports if not already loaded
        if (!categoryReportsCache) {
            const response = await fetch('who-category-reports.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            categoryReportsCache = await response.json();
            console.log('Category reports loaded:', Object.keys(categoryReportsCache).length, 'categories');
        }

        // Get the category report
        const categoryReport = categoryReportsCache[atcCode];

        if (!categoryReport || !categoryReport.full_report) {
            // Fallback to medication list if no research report available
            renderCategoryMedicationList(atcCode, atcName, modalBody);
            return;
        }

        // Render the full category research report
        renderCategoryReport(categoryReport, modalBody);

    } catch (error) {
        console.error('Error loading WHO category report:', error);
        // Fallback to medication list on error
        console.log('Falling back to medication list view');
        renderCategoryMedicationList(atcCode, atcName, modalBody);
    }
}

// Render category research report with full markdown
function renderCategoryReport(categoryData, container) {
    let html = '';

    // Category status badge if available
    if (categoryData.category_status) {
        html += '<div style="margin-bottom: 1.5rem;">';
        html += '<span class="status-badge status-TARGET_FOR_MODERNIZATION" style="font-size: 1rem; padding: 0.5rem 1rem;">' +
                categoryData.category_status + '</span>';
        html += '</div>';
    }

    // Category hierarchy
    if (categoryData.level1_code) {
        html += '<div class="classification-section">';
        html += '<h3>ATC Classification Hierarchy</h3>';
        html += '<div style="font-family: monospace; font-size: 0.9rem; line-height: 1.8;">';
        html += '<div><strong>' + categoryData.level1_code + '</strong> - ' + categoryData.level1_name + '</div>';
        if (categoryData.level2_code) {
            html += '<div style="margin-left: 1rem;"><strong>' + categoryData.level2_code + '</strong> - ' + categoryData.level2_name + '</div>';
        }
        if (categoryData.level3_code) {
            html += '<div style="margin-left: 2rem;"><strong>' + categoryData.level3_code + '</strong> - ' + categoryData.level3_name + '</div>';
        }
        html += '<div style="margin-left: 3rem; color: #667eea;"><strong>' + categoryData.level4_code + '</strong> - ' + categoryData.level4_name + '</div>';
        html += '</div></div>';
    }

    // Quick summary info
    if (categoryData.category_description || categoryData.therapeutic_purpose) {
        html += '<div class="classification-section">';
        html += '<h3>Category Overview</h3>';
        if (categoryData.medication_count) {
            html += '<p><strong>Medications in category:</strong> ' + categoryData.medication_count + '</p>';
        }
        if (categoryData.category_description) {
            html += '<p>' + categoryData.category_description + '</p>';
        }
        html += '</div>';
    }

    // Natural therapy flags
    const naturalFlags = [];
    if (categoryData.predominantly_natural) naturalFlags.push({ label: 'Predominantly Natural', color: '#10b981' });
    if (categoryData.mixed_natural_synthetic) naturalFlags.push({ label: 'Mixed Natural/Synthetic', color: '#8b5cf6' });
    if (categoryData.predominantly_synthetic) naturalFlags.push({ label: 'Predominantly Synthetic', color: '#6b7280' });
    if (categoryData.natural_therapies_available) naturalFlags.push({ label: 'Natural Therapies Available', color: '#06b6d4' });

    if (naturalFlags.length > 0) {
        html += '<div style="margin-bottom: 1.5rem;">';
        html += '<h3 style="font-size: 1.1rem; margin-bottom: 0.75rem; color: #555;">Category Profile</h3>';
        html += '<div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">';
        naturalFlags.forEach(flag => {
            html += '<span style="background: ' + flag.color + '; color: white; padding: 0.4rem 0.8rem; ' +
                    'border-radius: 20px; font-size: 0.85rem; font-weight: 500; display: inline-block;">' +
                    flag.label + '</span>';
        });
        html += '</div></div>';
    }

    // Medications in this category grouped by formulary status
    const medicationsInCategory = summaryData.filter(m => m.level4_code === categoryData.level4_code);

    if (medicationsInCategory.length > 0) {
        // Group by status
        const statusGroups = {};
        medicationsInCategory.forEach(med => {
            if (!statusGroups[med.status]) {
                statusGroups[med.status] = [];
            }
            statusGroups[med.status].push(med);
        });

        html += '<div style="border-top: 2px solid #e9ecef; padding-top: 1.5rem; margin-top: 1.5rem;">';
        html += '<h3 style="font-size: 1.2rem; margin-bottom: 1rem; color: #333;">Medications in This Category (' + medicationsInCategory.length + ')</h3>';

        // Status order for display
        const statusOrder = ['ALLOWED', 'TARGET_FOR_MODERNIZATION', 'NOT_ALLOWED', 'DISCONTINUED'];

        statusOrder.forEach(status => {
            if (statusGroups[status]) {
                html += '<div style="margin-bottom: 1.5rem;">';
                html += '<h4 style="font-size: 1rem; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">';
                html += '<span class="status-badge status-' + status + '">' + status.replace(/_/g, ' ') + '</span>';
                html += '<span style="color: #666; font-weight: normal;">(' + statusGroups[status].length + ' medications)</span>';
                html += '</h4>';
                html += '<ul style="margin-left: 1.5rem; column-count: 2; column-gap: 2rem;">';

                statusGroups[status].sort((a, b) => a.name.localeCompare(b.name)).forEach(med => {
                    html += '<li style="margin-bottom: 0.3rem;"><a href="#" onclick="viewMedicationReport(' + med.id +
                           '); document.getElementById(\'category-modal\').style.display = \'none\'; return false;" ' +
                           'style="color: #059669; text-decoration: none; font-size: 0.9rem;">' +
                           med.name.toUpperCase() + '</a></li>';
                });

                html += '</ul></div>';
            }
        });

        html += '</div>';
    }

    // Full research report
    if (categoryData.full_report) {
        html += '<div style="border-top: 2px solid #e9ecef; padding-top: 1.5rem; margin-top: 1.5rem;" class="markdown-report">';
        html += '<h3 style="font-size: 1.2rem; margin-bottom: 1rem; color: #333;">Research Report</h3>';
        html += marked.parse(fixMarkdownFormatting(categoryData.full_report));
        html += '</div>';
    }

    container.innerHTML = html;

    // Post-process the markdown to improve checkbox formatting
    improveCheckboxFormatting(container);
}

// Render medication list for a category (fallback or on request)
function renderCategoryMedicationList(atcCode, atcName, container) {
    // Get all medications in this category
    const medicationsInCategory = summaryData.filter(m => m.level4_code === atcCode);

    // Build category overview
    let html = '<div class="classification-section">';
    html += '<h3>Category Overview</h3>';
    html += '<p><strong>ATC Code:</strong> ' + atcCode + '</p>';
    html += '<p><strong>Category Name:</strong> ' + atcName + '</p>';
    html += '<p><strong>Medications in this category:</strong> ' + medicationsInCategory.length + '</p>';
    html += '</div>';

    // List medications by status
    const statusGroups = {};
    medicationsInCategory.forEach(med => {
        if (!statusGroups[med.status]) {
            statusGroups[med.status] = [];
        }
        statusGroups[med.status].push(med);
    });

    html += '<div class="classification-section">';
    html += '<h3>Medications by Status</h3>';

    Object.keys(statusGroups).sort().forEach(status => {
        html += '<div style="margin-bottom: 1rem;">';
        html += '<h4 style="color: #667eea; font-size: 1rem; margin-bottom: 0.5rem;">' +
               '<span class="status-badge status-' + status + '">' +
               status.replace(/_/g, ' ') + '</span> (' + statusGroups[status].length + ')</h4>';
        html += '<ul style="margin-left: 1.5rem;">';

        statusGroups[status].sort((a, b) => a.name.localeCompare(b.name)).forEach(med => {
            html += '<li><a href="#" onclick="viewMedicationReport(' + med.id +
                   '); document.getElementById(\'category-modal\').style.display = \'none\'; return false;">' +
                   med.name.toUpperCase() + '</a></li>';
        });

        html += '</ul></div>';
    });

    html += '</div>';

    container.innerHTML = html;
}

// View AHFS category medications
function viewAHFSCategory(ahfsCategory) {
    const modal = document.getElementById('category-modal');
    const modalTitle = document.getElementById('category-modal-title');
    const modalBody = document.getElementById('category-modal-body');

    // Show modal
    modal.style.display = 'block';

    // Extract category name
    const categoryName = ahfsCategory.split(' - ')[1] ? ahfsCategory.split(' - ')[1].split(' - ')[0] : ahfsCategory;
    modalTitle.textContent = `AHFS Category: ${categoryName}`;
    modalBody.innerHTML = '<div class="loading">Loading category information...</div>';

    try {
        // Get all medications in this category
        const medicationsInCategory = summaryData.filter(m =>
            m.ahfs_category && m.ahfs_category.includes(categoryName)
        );

        // Build category overview
        let html = '<div class="classification-section">';
        html += '<h3>Category Overview</h3>';
        html += '<p><strong>AHFS Therapeutic Class:</strong> ' + categoryName + '</p>';
        html += '<p><strong>Medications in this category:</strong> ' + medicationsInCategory.length + '</p>';
        html += '</div>';

        // List medications by status
        const statusGroups = {};
        medicationsInCategory.forEach(med => {
            if (!statusGroups[med.status]) {
                statusGroups[med.status] = [];
            }
            statusGroups[med.status].push(med);
        });

        html += '<div class="classification-section">';
        html += '<h3>Medications by Status</h3>';

        Object.keys(statusGroups).sort().forEach(status => {
            html += '<div style="margin-bottom: 1rem;">';
            html += '<h4 style="color: #764ba2; font-size: 1rem; margin-bottom: 0.5rem;">' +
                   '<span class="status-badge status-' + status + '">' +
                   status.replace(/_/g, ' ') + '</span> (' + statusGroups[status].length + ')</h4>';
            html += '<ul style="margin-left: 1.5rem;">';

            statusGroups[status].sort((a, b) => a.name.localeCompare(b.name)).forEach(med => {
                html += '<li><a href="#" onclick="viewMedicationReport(' + med.id +
                       '); document.getElementById(\'category-modal\').style.display = \'none\'; return false;">' +
                       med.name.toUpperCase() + '</a></li>';
            });

            html += '</ul></div>';
        });

        html += '</div>';

        modalBody.innerHTML = html;

    } catch (error) {
        console.error('Error loading AHFS category:', error);
        modalBody.innerHTML = '<p class="error">Error loading category information: ' + error.message + '</p>';
    }
}

// Render the full medication report with proper formatting
function renderMedicationReport(data, container) {
    let html = '';

    // Add status badge
    html += '<div style="margin-bottom: 1.5rem;">';
    html += '<span class="status-badge status-' + data.status + '" style="font-size: 1rem; padding: 0.5rem 1rem;">' +
            data.status.replace(/_/g, ' ') + '</span>';
    html += '</div>';

    // Add classification info in a grid
    if ((data.classification && data.classification.level4_code) || data.ahfs_category) {
        html += '<div class="classification-section">';
        html += '<h3>Classifications</h3>';
        html += '<div class="classification-grid">';

        if (data.classification && data.classification.level4_code) {
            html += '<div class="classification-item">';
            html += '<div class="classification-item-label">WHO ATC Level 4</div>';
            html += '<div><span class="atc-code">' + data.classification.level4_code + '</span></div>';
            html += '<div style="margin-top: 0.25rem;">' + data.classification.level4_name + '</div>';
            html += '</div>';
        }

        if (data.ahfs_category) {
            html += '<div class="classification-item ahfs">';
            html += '<div class="classification-item-label">AHFS Therapeutic Class</div>';
            html += '<div><span class="ahfs-code">' + data.ahfs_category.split(' - ')[0] + '</span></div>';
            html += '<div style="margin-top: 0.25rem;">' + data.ahfs_category.split(' - ')[1] + '</div>';
            html += '</div>';
        }

        html += '</div></div>';
    }

    // Add rationale if available
    if (data.rationale) {
        html += '<div style="background: #fff3cd; padding: 1rem; border-radius: 4px; margin-bottom: 1.5rem;">';
        html += '<strong>Formulary Rationale:</strong> ' + data.rationale;
        html += '</div>';
    }

    // Add natural connection flags - ONLY show TRUE values as colored pills
    const connections = data.natural_connection;
    const connectionLabels = {
        'direct_natural_source': { label: 'Direct Natural Source', color: '#10b981' },
        'semi_synthetic_natural': { label: 'Semi-Synthetic from Natural', color: '#3b82f6' },
        'structural_analog_natural': { label: 'Structural Analog of Natural', color: '#8b5cf6' },
        'endogenous_compound': { label: 'Endogenous Compound', color: '#ec4899' },
        'biosynthetic_product': { label: 'Biosynthetic Product', color: '#f59e0b' },
        'works_natural_pathways': { label: 'Works via Natural Pathways', color: '#06b6d4' },
        'facilitates_natural_processes': { label: 'Facilitates Natural Processes', color: '#14b8a6' },
        'no_natural_connection': { label: 'No Natural Connection', color: '#6b7280' }
    };

    // Filter to only true connections
    const trueConnections = Object.entries(connections).filter(([key, value]) => value === true);

    if (trueConnections.length > 0) {
        html += '<div style="margin-bottom: 1.5rem;">';
        html += '<h3 style="font-size: 1.1rem; margin-bottom: 0.75rem; color: #555;">Natural Connection Profile</h3>';
        html += '<div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">';

        trueConnections.forEach(([key]) => {
            const info = connectionLabels[key];
            html += '<span style="background: ' + info.color + '; color: white; padding: 0.4rem 0.8rem; ' +
                    'border-radius: 20px; font-size: 0.85rem; font-weight: 500; display: inline-block;">' +
                    info.label + '</span>';
        });

        html += '</div></div>';
    }

    // Render the full markdown report with improved checkbox styling
    if (data.full_report) {
        html += '<div style="border-top: 2px solid #e9ecef; padding-top: 1.5rem; margin-top: 1.5rem;" class="markdown-report">';
        html += marked.parse(fixMarkdownFormatting(data.full_report));
        html += '</div>';
    }

    container.innerHTML = html;

    // Post-process the markdown to improve checkbox formatting
    improveCheckboxFormatting(container);
}

// Setup modal close functionality
function setupModals() {
    // Medication report modal
    const reportModal = document.getElementById('report-modal');
    const reportCloseBtn = reportModal.querySelector('.close');

    reportCloseBtn.onclick = function() {
        reportModal.style.display = 'none';
    }

    // Category modal
    const categoryModal = document.getElementById('category-modal');
    const categoryCloseBtn = categoryModal.querySelector('.category-close');

    categoryCloseBtn.onclick = function() {
        categoryModal.style.display = 'none';
    }

    // Close on outside click
    window.onclick = function(event) {
        if (event.target == reportModal) {
            reportModal.style.display = 'none';
        }
        if (event.target == categoryModal) {
            categoryModal.style.display = 'none';
        }
    }

    // Close on Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            if (reportModal.style.display === 'block') {
                reportModal.style.display = 'none';
            }
            if (categoryModal.style.display === 'block') {
                categoryModal.style.display = 'none';
            }
        }
    });
}

// Setup filter event listeners
function setupFilters() {
    // Status filter buttons
    const statusButtons = document.querySelectorAll('#status-filters .filter-btn');
    statusButtons.forEach(button => {
        button.addEventListener('click', function() {
            statusButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            const filterValue = this.getAttribute('data-filter');
            filterTable(filterValue, null, null);
        });
    });

    // ATC filter dropdown
    const atcSelect = document.getElementById('atc-filter');
    atcSelect.addEventListener('change', function() {
        filterTable(null, this.value, null);
    });

    // AHFS filter dropdown
    const ahfsSelect = document.getElementById('ahfs-filter');
    ahfsSelect.addEventListener('change', function() {
        filterTable(null, null, this.value);
    });
}

// Filter the table based on status, ATC, and/or AHFS
function filterTable(statusFilter, atcFilter, ahfsFilter) {
    if (!dataTable) return;

    // Get current filter values
    const currentStatus = statusFilter !== null ? statusFilter :
        document.querySelector('#status-filters .filter-btn.active')?.getAttribute('data-filter') || 'all';
    const currentATC = atcFilter !== null ? atcFilter :
        document.getElementById('atc-filter')?.value || 'all';
    const currentAHFS = ahfsFilter !== null ? ahfsFilter :
        document.getElementById('ahfs-filter')?.value || 'all';

    // Apply custom filtering
    $.fn.dataTable.ext.search.push(function(settings, data, dataIndex) {
        const row = summaryData[dataIndex];

        // Status filter
        if (currentStatus !== 'all' && row.status !== currentStatus) {
            return false;
        }

        // ATC filter
        if (currentATC !== 'all' && row.level4_code !== currentATC) {
            return false;
        }

        // AHFS filter
        if (currentAHFS !== 'all' && (!row.ahfs_category || !row.ahfs_category.includes(currentAHFS))) {
            return false;
        }

        return true;
    });

    dataTable.draw();
    $.fn.dataTable.ext.search.pop();
}

// Improve checkbox formatting in the markdown report
function improveCheckboxFormatting(container) {
    const reportDiv = container.querySelector('.markdown-report');
    if (!reportDiv) return;

    // Find the paragraph containing "Evidence Categories Present:"
    const allElements = reportDiv.querySelectorAll('p, h1, h2, h3, h4');
    let headerElement = null;
    let headerIndex = -1;

    // Find the header element
    for (let i = 0; i < allElements.length; i++) {
        const text = allElements[i].textContent;
        if (text.includes('Evidence Categories Present:')) {
            headerElement = allElements[i];
            headerIndex = i;
            break;
        }
    }

    if (!headerElement) return;

    // Collect all checkbox items from the header and following elements
    const checkboxItems = [];

    // First, check the header element itself for inline checkboxes
    const headerHTML = headerElement.innerHTML;
    const headerLines = headerHTML.split(/\n|<br>|<br\/>/);

    headerLines.forEach(line => {
        const plainLine = line.replace(/<[^>]*>/g, '').trim();
        if (!plainLine || plainLine.includes('Evidence Categories Present:')) return;

        const isChecked = plainLine.includes('☑');
        const isUnchecked = plainLine.includes('☐');

        if (isChecked || isUnchecked) {
            let label = plainLine.replace(/☑|☐/g, '').trim();
            checkboxItems.push({ checked: isChecked, label: label });
        }
    });

    // Now look at following paragraph elements for additional checkboxes
    const elementsToRemove = [];

    for (let i = headerIndex + 1; i < allElements.length; i++) {
        const element = allElements[i];
        const text = element.textContent.trim();

        // Stop if we hit another header or section
        if (element.tagName.match(/^H[1-4]$/) && !text.includes('☑') && !text.includes('☐')) {
            break;
        }

        // Check if this element contains checkboxes
        const hasCheckbox = text.includes('☑') || text.includes('☐');

        if (hasCheckbox) {
            // Extract checkbox items from this element
            const elementHTML = element.innerHTML;
            const elementLines = elementHTML.split(/\n|<br>|<br\/>/);

            elementLines.forEach(line => {
                const plainLine = line.replace(/<[^>]*>/g, '').trim();
                if (!plainLine) return;

                const isChecked = plainLine.includes('☑');
                const isUnchecked = plainLine.includes('☐');

                if (isChecked || isUnchecked) {
                    let label = plainLine.replace(/☑|☐/g, '').trim();
                    checkboxItems.push({ checked: isChecked, label: label });
                }
            });

            // Mark this element for removal
            elementsToRemove.push(element);
        } else if (elementsToRemove.length > 0) {
            // If we already found checkboxes and now hit non-checkbox content, stop
            break;
        }
    }

    // Build the new formatted checkbox box
    if (checkboxItems.length > 0) {
        let newHtml = '<div class="evidence-categories-box">';
        newHtml += '<h4>Evidence Categories Present:</h4>';
        newHtml += '<ul>';

        checkboxItems.forEach(item => {
            newHtml += '<li>';

            if (item.checked) {
                newHtml += '<span class="checkbox-checked">✓</span>';
                newHtml += '<span style="color: #333; font-size: 0.95rem; line-height: 1.4; font-weight: 500;">' + item.label + '</span>';
            } else {
                newHtml += '<span class="checkbox-unchecked"></span>';
                newHtml += '<span style="color: #6b7280; font-size: 0.95rem; line-height: 1.4;">' + item.label + '</span>';
            }

            newHtml += '</li>';
        });

        newHtml += '</ul></div>';

        // Replace the header element with the new formatted box
        const newDiv = document.createElement('div');
        newDiv.innerHTML = newHtml;
        headerElement.replaceWith(newDiv);

        // Remove the additional checkbox elements
        elementsToRemove.forEach(el => el.remove());
    }
}

// Fix markdown formatting issues - add proper spacing between elements
function fixMarkdownFormatting(markdown) {
    if (!markdown) return '';

    // Fix headers that run together (# Header1 # Header2)
    // Add double newlines before each # that doesn't already have them
    let fixed = markdown.replace(/([^\n])(#{1,6}\s)/g, '$1\n\n$2');

    // Ensure blank line after headers
    fixed = fixed.replace(/(#{1,6}\s[^\n]+)\n([^\n#])/g, '$1\n\n$2');

    // Ensure blank line before lists
    fixed = fixed.replace(/([^\n])\n([-*+]\s)/g, '$1\n\n$2');
    fixed = fixed.replace(/([^\n])\n(\d+\.\s)/g, '$1\n\n$2');

    // Ensure blank line after lists (when followed by non-list text)
    fixed = fixed.replace(/([-*+]\s[^\n]+)\n([^\n-*+\d])/g, '$1\n\n$2');

    return fixed;
}

// Render WHO mapping information for unclassified medications
function renderMappingInfo(mappingType, mappingNotes) {
    if (!mappingType) return '';

    let html = '';

    // Define badge colors and labels for different mapping types
    const mappingTypes = {
        'not_in_who': { label: 'Not in WHO', color: '#f59e0b', tooltip: 'Too new, discontinued, or not therapeutic' },
        'combination_component': { label: 'Combination Only', color: '#8b5cf6', tooltip: 'Only exists in combinations' },
        'name_variant': { label: 'Name Variant', color: '#06b6d4', tooltip: 'Listed under different name in WHO' },
        'approximation': { label: 'Approximation', color: '#3b82f6', tooltip: 'Closest code identified' },
        'corrected_direct_match': { label: 'Direct Match', color: '#10b981', tooltip: 'Exact match found' },
        'exact': { label: 'Exact Match', color: '#10b981', tooltip: 'Exact match in WHO' }
    };

    const typeInfo = mappingTypes[mappingType] || { label: mappingType.replace(/_/g, ' '), color: '#6b7280', tooltip: '' };

    // Display mapping type badge
    html += '<div class="category-label">WHO Mapping</div>';
    html += '<div style="margin-top: 0.25rem;"><span style="background: ' + typeInfo.color + '; ' +
            'color: white; padding: 0.25rem 0.6rem; border-radius: 4px; font-size: 0.75rem; ' +
            'font-weight: 500; display: inline-block;" title="' + typeInfo.tooltip + '">' +
            typeInfo.label + '</span></div>';

    // Extract ATC codes from mapping notes if present
    if (mappingNotes) {
        const atcCodeMatch = mappingNotes.match(/([A-Z]\d{2}[A-Z]{2}\d{2})/g);
        if (atcCodeMatch && atcCodeMatch.length > 0) {
            html += '<div style="margin-top: 0.5rem; font-size: 0.8rem;">';
            html += '<span style="color: #666;">Related: </span>';
            atcCodeMatch.forEach((code, index) => {
                if (index > 0) html += ', ';
                html += '<span class="atc-code" style="font-size: 0.75rem;">' + code + '</span>';
            });
            html += '</div>';
        }

        // Show short preview of notes
        const preview = mappingNotes.substring(0, 60);
        if (mappingNotes.length > 60) {
            html += '<div style="margin-top: 0.25rem; font-size: 0.75rem; color: #666; font-style: italic;">' +
                    preview + '...</div>';
        } else if (preview) {
            html += '<div style="margin-top: 0.25rem; font-size: 0.75rem; color: #666; font-style: italic;">' +
                    preview + '</div>';
        }
    }

    return html;
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// View switching functions
document.getElementById('view-medications')?.addEventListener('click', function() {
    switchView('medications');
});

document.getElementById('view-categories')?.addEventListener('click', function() {
    switchView('categories');
});

function switchView(view) {
    currentView = view;

    // Update button states
    const medBtn = document.getElementById('view-medications');
    const catBtn = document.getElementById('view-categories');

    if (view === 'medications') {
        medBtn?.classList.add('active');
        catBtn?.classList.remove('active');
        document.getElementById('medications-view').style.display = 'block';
        document.getElementById('categories-view').style.display = 'none';
    } else {
        medBtn?.classList.remove('active');
        catBtn?.classList.add('active');
        document.getElementById('medications-view').style.display = 'none';
        document.getElementById('categories-view').style.display = 'block';

        // Load categories if not already loaded
        if (!categoriesTable) {
            loadCategoriesView();
        }
    }
}

// Load and initialize categories view
async function loadCategoriesView() {
    try {
        console.log('Loading categories view...');

        // Load category reports if not already loaded
        if (!categoryReportsCache) {
            const response = await fetch('who-category-reports.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            categoryReportsCache = await response.json();
            console.log('Category reports loaded:', Object.keys(categoryReportsCache).length, 'categories');
        }

        // Convert to array and enrich with medication counts from summaryData
        const categoriesArray = Object.values(categoryReportsCache).map(cat => {
            const medCount = summaryData.filter(m => m.level4_code === cat.level4_code).length;
            return {
                ...cat,
                med_count: medCount
            };
        });

        // Initialize categories table
        categoriesTable = $('#categories-table').DataTable({
            data: categoriesArray,
            columns: [
                {
                    data: 'level4_code',
                    width: '8%',
                    render: function(data) {
                        return '<span class="atc-code">' + data + '</span>';
                    }
                },
                {
                    data: 'level4_name',
                    width: '25%',
                    render: function(data) {
                        return '<strong>' + data.toUpperCase() + '</strong>';
                    }
                },
                {
                    data: null,
                    width: '40%',
                    render: function(data, type, row) {
                        let hierarchy = '<div style="font-size: 0.8rem; color: #666; line-height: 1.6;">';
                        if (row.level1_code) {
                            hierarchy += '<div><strong>' + row.level1_code + '</strong> ' + row.level1_name + '</div>';
                        }
                        if (row.level2_code) {
                            hierarchy += '<div style="margin-left: 0.5rem;"><strong>' + row.level2_code + '</strong> ' + row.level2_name + '</div>';
                        }
                        if (row.level3_code) {
                            hierarchy += '<div style="margin-left: 1rem;"><strong>' + row.level3_code + '</strong> ' + row.level3_name + '</div>';
                        }
                        hierarchy += '</div>';
                        return hierarchy;
                    }
                },
                {
                    data: 'med_count',
                    width: '12%',
                    render: function(data) {
                        return data + ' medications';
                    }
                },
                {
                    data: null,
                    orderable: false,
                    width: '15%',
                    render: function(data, type, row) {
                        return '<button class="btn-view" onclick="viewWHOCategory(\'' +
                               row.level4_code + '\', \'' + escapeHtml(row.level4_name) + '\')">View Report</button>';
                    }
                }
            ],
            pageLength: 25,
            lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
            order: [[0, 'asc']],
            dom: '<"top"lf>rt<"bottom"ip"><clear">',
            language: {
                search: "Search categories:",
                lengthMenu: "Show _MENU_ categories",
                info: "Showing _START_ to _END_ of _TOTAL_ categories",
                infoFiltered: "(filtered from _MAX_ total categories)"
            }
        });

        document.getElementById('categories-loading').style.display = 'none';
        document.getElementById('categories-table').style.display = 'table';
        console.log('Categories view loaded successfully');

    } catch (error) {
        console.error('Error loading categories view:', error);
        const loadingEl = document.getElementById('categories-loading');
        const errorEl = document.getElementById('categories-error');
        if (loadingEl) loadingEl.style.display = 'none';
        if (errorEl) {
            errorEl.textContent = 'Error loading category data: ' + error.message;
            errorEl.style.display = 'block';
        }
    }
}
