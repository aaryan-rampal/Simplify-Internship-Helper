// API Base URL
const API_BASE = 'http://localhost:8000/api';

// Global state
let allInternships = [];
let filteredInternships = [];
let allResumes = [];
let currentJobIdForResume = null;
let selectedCategories = new Set();
let selectedLocations = new Set();
let selectedCompanies = new Set();

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    await loadInternships();
    await loadResumes();
    setupEventListeners();
    updateStats();
});

// Setup event listeners
function setupEventListeners() {
    // Multi-select dropdown toggles
    document.getElementById('categoryFilterHeader').addEventListener('click', () => toggleDropdown('category'));
    document.getElementById('locationFilterHeader').addEventListener('click', () => toggleDropdown('location'));
    document.getElementById('companyFilterHeader').addEventListener('click', () => toggleDropdown('company'));
    
    // Initialize category checkboxes
    document.querySelectorAll('#categoryFilterDropdown input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', handleCategoryChange);
    });

    // Date filters
    document.getElementById('dateFromFilter').addEventListener('change', applyFilters);
    document.getElementById('dateToFilter').addEventListener('change', applyFilters);
    document.querySelectorAll('input[name="faangFilter"]').forEach(radio => radio.addEventListener('change', applyFilters));
    document.querySelectorAll('input[name="phdFilter"]').forEach(radio => radio.addEventListener('change', applyFilters));
    document.querySelectorAll('input[name="clearanceFilter"]').forEach(radio => radio.addEventListener('change', applyFilters));
    document.getElementById('showAppliedFilter').addEventListener('change', applyFilters);

    // Reset filters
    document.getElementById('resetFilters').addEventListener('click', resetFilters);

    // Refresh data
    document.getElementById('refreshBtn').addEventListener('click', refreshData);

    // Resume upload
    document.getElementById('resumeUpload').addEventListener('change', handleResumeUpload);

    // Modal close
    document.querySelector('.close').addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('resumeModal');
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Close dropdowns when clicking outside (but not when clicking inside dropdown)
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.multi-select-container')) {
            document.querySelectorAll('.multi-select-container').forEach(container => {
                container.classList.remove('open');
            });
        }
    });
    
    // Prevent dropdown from closing when clicking inside
    document.addEventListener('click', (e) => {
        if (e.target.closest('.multi-select-dropdown')) {
            e.stopPropagation();
        }
    });
}

// Setup table event listeners (called after rendering)
function setupTableEventListeners() {
    // Apply checkbox
    document.querySelectorAll('.apply-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const jobId = this.dataset.jobId;
            const internship = allInternships.find(i => i.job_id === jobId);
            if (!internship || !internship.job_id) {
                console.error('Invalid internship data:', {jobId, internship});
                showToast('Error: Invalid job data', 'error');
                return;
            }
            toggleApplied(jobId, this.checked);
        });
    });

    // Resume select
    document.querySelectorAll('.resume-select').forEach(select => {
        select.addEventListener('change', function() {
            const jobId = this.dataset.jobId;
            const internship = allInternships.find(i => i.job_id === jobId);
            if (!internship || !internship.job_id) {
                console.error('Invalid internship data:', {jobId, internship});
                showToast('Error: Invalid job data', 'error');
                return;
            }
            selectResume(jobId, this.value);
        });
    });

    // Notes button
    document.querySelectorAll('.notes-btn').forEach(button => {
        button.addEventListener('click', function() {
            const jobId = this.dataset.jobId;
            const internship = allInternships.find(i => i.job_id === jobId);
            if (!internship || !internship.job_id) {
                console.error('Invalid internship data:', {jobId, internship});
                showToast('Error: Invalid job data', 'error');
                return;
            }
            openNotes(jobId);
        });
    });
}

// Load internships from API
async function loadInternships() {
    try {
        const response = await fetch(`${API_BASE}/internships`);
        if (!response.ok) throw new Error('Failed to load internships');

        allInternships = await response.json();
        filteredInternships = [...allInternships];
        populateFilterDropdowns();
        renderInternships();
        updateStats();
    } catch (error) {
        console.error('Error loading internships:', error);
        showToast('Failed to load internships', 'error');
    }
}

// Load resumes from API
async function loadResumes() {
    try {
        const response = await fetch(`${API_BASE}/resumes`);
        if (!response.ok) throw new Error('Failed to load resumes');

        allResumes = await response.json();
    } catch (error) {
        console.error('Error loading resumes:', error);
    }
}

// Apply filters
function applyFilters() {
    const dateFrom = document.getElementById('dateFromFilter').value;
    const dateTo = document.getElementById('dateToFilter').value;
    const faangFilter = document.querySelector('input[name="faangFilter"]:checked').value;
    const phdFilter = document.querySelector('input[name="phdFilter"]:checked').value;
    const clearanceFilter = document.querySelector('input[name="clearanceFilter"]:checked').value;
    const appliedOnly = document.getElementById('showAppliedFilter').checked;

    filteredInternships = allInternships.filter(internship => {
        if (selectedCategories.size > 0 && !selectedCategories.has(internship.category)) return false;
        if (selectedLocations.size > 0 && !selectedLocations.has(internship.location)) return false;
        if (selectedCompanies.size > 0 && !selectedCompanies.has(internship.company)) return false;
        if (dateFrom && internship.date_posted < dateFrom) return false;
        if (dateTo && internship.date_posted > dateTo) return false;
        if (faangFilter === 'only' && !(internship.is_faang_plus === true || internship.is_faang_plus === 'True')) return false;
        if (faangFilter === 'exclude' && (internship.is_faang_plus === true || internship.is_faang_plus === 'True')) return false;
        if (phdFilter === 'only' && !internship.has_phd_emoji) return false;
        if (phdFilter === 'exclude' && internship.has_phd_emoji) return false;
        if (clearanceFilter === 'only' && !internship.has_clearance_emoji) return false;
        if (clearanceFilter === 'exclude' && internship.has_clearance_emoji) return false;
        if (appliedOnly && !internship.applied) return false;
        return true;
    });

    populateFilterDropdowns();
    renderInternships();
    updateStats();
}

// Reset filters
function resetFilters() {
    selectedCategories.clear();
    selectedLocations.clear();
    selectedCompanies.clear();

    document.querySelectorAll('#categoryFilterDropdown input[type="checkbox"]').forEach(cb => cb.checked = false);

    updateHeaderText('category');
    updateHeaderText('location');
    updateHeaderText('company');

    document.getElementById('dateFromFilter').value = '';
    document.getElementById('dateToFilter').value = '';
    document.querySelector('input[name="faangFilter"][value="all"]').checked = true;
    document.querySelector('input[name="phdFilter"][value="all"]').checked = true;
    document.querySelector('input[name="clearanceFilter"][value="all"]').checked = true;
    document.getElementById('showAppliedFilter').checked = false;

    applyFilters();
}

// Populate location and company dropdowns dynamically
function populateFilterDropdowns() {
    const locations = new Set();
    const companies = new Set();
    
    filteredInternships.forEach(internship => {
        locations.add(internship.location);
        companies.add(internship.company);
    });
    
    const locationOptions = document.querySelector('#locationFilterDropdown .dropdown-options');
    locationOptions.innerHTML = Array.from(locations).sort().map(location => 
        `<label><input type="checkbox" value="${escapeHtml(location)}" ${selectedLocations.has(location) ? 'checked' : ''}> ${escapeHtml(location)}</label>`
    ).join('');
    
    const companyOptions = document.querySelector('#companyFilterDropdown .dropdown-options');
    companyOptions.innerHTML = Array.from(companies).sort().map(company => 
        `<label><input type="checkbox" value="${escapeHtml(company)}" ${selectedCompanies.has(company) ? 'checked' : ''}> ${escapeHtml(company)}</label>`
    ).join('');
    
    attachDropdownListeners();
}

// Attach event listeners to dropdown checkboxes
function attachDropdownListeners() {
    document.querySelectorAll('#locationFilterDropdown .dropdown-options input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', handleLocationChange);
    });
    
    document.querySelectorAll('#companyFilterDropdown .dropdown-options input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', handleCompanyChange);
    });
    
    const locationSearch = document.getElementById('locationSearch');
    const companySearch = document.getElementById('companySearch');
    
    if (locationSearch) {
        locationSearch.addEventListener('input', (e) => filterDropdownOptions('location', e.target.value));
    }
    
    if (companySearch) {
        companySearch.addEventListener('input', (e) => filterDropdownOptions('company', e.target.value));
    }
}

// Filter dropdown options based on search
function filterDropdownOptions(type, searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    const selector = type === 'location' ? '#locationFilterDropdown .dropdown-options label' : '#companyFilterDropdown .dropdown-options label';
    
    document.querySelectorAll(selector).forEach(label => {
        const text = label.textContent.toLowerCase();
        if (text.includes(searchLower)) {
            label.style.display = 'block';
        } else {
            label.style.display = 'none';
        }
    });
}

// Handle category selection
function handleCategoryChange(e) {
    if (e.target.checked) {
        selectedCategories.add(e.target.value);
    } else {
        selectedCategories.delete(e.target.value);
    }
    updateHeaderText('category');
    applyFilters();
}

// Handle location selection
function handleLocationChange(e) {
    if (e.target.checked) {
        selectedLocations.add(e.target.value);
    } else {
        selectedLocations.delete(e.target.value);
    }
    updateHeaderText('location');
    applyFilters();
}

// Handle company selection
function handleCompanyChange(e) {
    if (e.target.checked) {
        selectedCompanies.add(e.target.value);
    } else {
        selectedCompanies.delete(e.target.value);
    }
    updateHeaderText('company');
    applyFilters();
}

// Update header text to show selected count
function updateHeaderText(type) {
    let header, selectedSet, defaultText;
    
    if (type === 'category') {
        header = document.querySelector('#categoryFilterHeader .multi-select-text');
        selectedSet = selectedCategories;
        defaultText = 'All Categories';
    } else if (type === 'location') {
        header = document.querySelector('#locationFilterHeader .multi-select-text');
        selectedSet = selectedLocations;
        defaultText = 'All Locations';
    } else if (type === 'company') {
        header = document.querySelector('#companyFilterHeader .multi-select-text');
        selectedSet = selectedCompanies;
        defaultText = 'All Companies';
    }
    
    if (selectedSet.size === 0) {
        header.textContent = defaultText;
    } else if (selectedSet.size === 1) {
        header.textContent = Array.from(selectedSet)[0];
    } else {
        header.textContent = `${selectedSet.size} selected`;
    }
}

// Toggle dropdown open/close
function toggleDropdown(type) {
    const container = document.getElementById(`${type}FilterHeader`).parentElement;
    const isOpen = container.classList.contains('open');
    
    document.querySelectorAll('.multi-select-container').forEach(c => c.classList.remove('open'));
    
    if (!isOpen) {
        container.classList.add('open');
        
        if (type === 'location') {
            const searchInput = document.getElementById('locationSearch');
            if (searchInput) {
                searchInput.value = '';
                filterDropdownOptions('location', '');
                setTimeout(() => searchInput.focus(), 100);
            }
        } else if (type === 'company') {
            const searchInput = document.getElementById('companySearch');
            if (searchInput) {
                searchInput.value = '';
                filterDropdownOptions('company', '');
                setTimeout(() => searchInput.focus(), 100);
            }
        }
    }
}

// Render internships table
function renderInternships() {
    const tbody = document.getElementById('internshipsBody');

    if (filteredInternships.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="no-results">No internships found</td></tr>';
        return;
    }

    console.log('Rendering internships. Total filtered:', filteredInternships.length);
    tbody.innerHTML = filteredInternships.map((internship, index) => {
        return `
<tr class="${internship.applied ? 'applied' : ''}" data-job-id="${internship.job_id}">
            <td>
                <input type="checkbox"
                       class="apply-checkbox"
                       data-job-id="${internship.job_id}"
                       ${internship.applied ? 'checked' : ''}>
            </td>
             <td>
                 ${escapeHtml(internship.company)}
                 ${internship.is_faang_plus === 'True' ? '<span class="badge badge-faang">🔥 FAANG+</span>' : ''}
             </td>
             <td>${escapeHtml(stripEmojis(internship.role))}</td>
            <td>${escapeHtml(internship.location)}</td>
            <td><span class="badge badge-category">${getCategoryName(internship.category)}</span></td>
            <td style="font-size: 18px; text-align: center;">${internship.emojis || ''}</td>
            <td>${formatDate(internship.date_posted)}</td>
            <td>
                <div class="link-group">
                    ${internship.base_url ? '<a href="' + escapeHtml(internship.base_url) + '" target="_blank">🔗 Direct Link</a>' : ''}
                    ${internship.application_url ? '<a href="' + escapeHtml(internship.application_url) + '" target="_blank">📝 Apply (Simplify)</a>' : ''}
                </div>
            </td>
            <td>
                <select class="resume-select" data-job-id="${internship.job_id}">
                    <option value="">No resume</option>
                    ${allResumes.map(resume => '<option value="' + resume.hash + '" ' + (internship.resume_hash === resume.hash ? 'selected' : '') + '>' + escapeHtml(resume.original_filename) + '</option>').join('')}
                </select>
            </td>
            <td>
                <button class="btn btn-secondary btn-sm notes-btn" data-job-id="${internship.job_id}">
                    📝 Notes
                </button>
            </td>
        </tr>
`
}).join('')

    // Add event listeners using event delegation
    setupTableEventListeners();
}

// Update stats
function updateStats() {
    document.getElementById('totalCount').textContent = filteredInternships.length;
    document.getElementById('appliedCount').textContent = filteredInternships.filter(i => i.applied).length;
    document.getElementById('faangCount').textContent = filteredInternships.filter(i => i.is_faang_plus === 'True').length;
}

// Toggle applied status
async function toggleApplied(jobId, applied) {
    try {
        const response = await fetch(`${API_BASE}/internships/${encodeURIComponent(jobId)}/apply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ applied })
        });

        if (!response.ok) throw new Error('Failed to update application status');

        // Update local state
        const internship = allInternships.find(i => i.job_id === jobId);
        if (internship) {
            internship.applied = applied;
            applyFilters();
        }

        showToast(applied ? 'Marked as applied' : 'Unmarked application');
    } catch (error) {
        console.error('Error updating application:', error);
        showToast('Failed to update status', 'error');
    }
}

// Select resume for application
async function selectResume(jobId, resumeHash) {
    try {
        const response = await fetch(`${API_BASE}/internships/${encodeURIComponent(jobId)}/apply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                applied: true,
                resume_hash: resumeHash || null
            })
        });

        if (!response.ok) throw new Error('Failed to update resume');

        // Update local state
        const internship = allInternships.find(i => i.job_id === jobId);
        if (internship) {
            internship.resume_hash = resumeHash || null;
            internship.applied = true;
        }

        showToast('Resume updated');
    } catch (error) {
        console.error('Error updating resume:', error);
        showToast('Failed to update resume', 'error');
    }
}

// Handle resume upload
async function handleResumeUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${API_BASE}/resumes/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Failed to upload resume');

        const result = await response.json();

        if (result.duplicate) {
            showToast('Resume already exists (duplicate detected)', 'error');
        } else {
            showToast('Resume uploaded successfully');
            await loadResumes();
            renderInternships();
        }

        // Reset file input
        event.target.value = '';
    } catch (error) {
        console.error('Error uploading resume:', error);
        showToast('Failed to upload resume', 'error');
    }
}

// Refresh data from GitHub
async function refreshData() {
    const btn = document.getElementById('refreshBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Refreshing...';

    try {
        const response = await fetch(`${API_BASE}/refresh`, {
            method: 'POST'
        });

        if (!response.ok) throw new Error('Failed to refresh data');

        const result = await response.json();

        if (result.success) {
            showToast(`Data refreshed! ${result.internships_count} internships loaded`);
            await loadInternships();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error refreshing data:', error);
        showToast('Failed to refresh data', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '🔄 Refresh Data';
    }
}

// Utility functions
function getCategoryName(category) {
    const names = {
        'software_engineering': 'SWE',
        'data_science': 'DS/ML',
        'quant_finance': 'Quant',
        'product_management': 'PM',
        'hardware_engineering': 'HW'
    };
    return names[category] || category;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function stripEmojis(str) {
    // Remove common emoji ranges (can be expanded if needed)
    return str.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function openModal() {
    document.getElementById('resumeModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('resumeModal').style.display = 'none';
}

function openNotes(jobId) {
    const notes = prompt('Add notes for this application:');
    if (notes !== null) {
        updateNotes(jobId, notes);
    }
}

async function updateNotes(jobId, notes) {
    try {
        const response = await fetch(`${API_BASE}/internships/${encodeURIComponent(jobId)}/apply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                applied: true,
                notes: notes
            })
        });

        if (!response.ok) throw new Error('Failed to update notes');

        showToast('Notes saved');
    } catch (error) {
        console.error('Error updating notes:', error);
        showToast('Failed to save notes', 'error');
    }
}
