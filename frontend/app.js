// API Base URL
const API_BASE = 'http://localhost:8000/api';

// Global state
let allInternships = [];
let filteredInternships = [];
let allResumes = [];
let currentInternshipIdForResume = null;
let selectedCategories = new Set();
let selectedLocations = new Set();
let selectedCompanies = new Set();

// Pagination state
const PAGE_SIZE = 40;
let currentPage = 0;
let isLoadingMore = false;
let hasMoreData = true;

// Favicon cache
const faviconCache = new Map();

// Extract domain from URL
function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        let domain = urlObj.hostname.replace('www.', '');
        
        // Handle special cases for subdomains that should use the main domain
        const specialCases = {
            'wd1.myworkdayjobs.com': 'workday.com',
            'wd3.myworkdayjobs.com': 'workday.com', 
            'wd5.myworkdayjobs.com': 'workday.com',
            'wd12.myworkdayjobs.com': 'workday.com',
            'wd503.myworkdayjobs.com': 'workday.com',
            'wd108.myworkdayjobs.com': 'workday.com',
            'myworkdaysite.com': 'workday.com'
        };
        
        // Check for special cases first
        if (specialCases[domain]) {
            return specialCases[domain];
        }
        
        // For common job platforms, use the service name
        const jobPlatforms = {
            'bamboohr.com': 'bamboohr.com',
            'lever.co': 'lever.co',
            'greenhouse.io': 'greenhouse.io',
            'workday.com': 'workday.com',
            'icims.com': 'icims.com',
            'smartrecruiters.com': 'smartrecruiters.com',
            'ashbyhq.com': 'ashbyhq.com',
            'applytojob.com': 'applytojob.com',
            'jibeapply.com': 'jibeapply.com',
            'ultipro.com': 'ultipro.com'
        };
        
        // Extract base domain for job platforms
        const parts = domain.split('.');
        if (parts.length >= 2) {
            const baseDomain = parts.slice(-2).join('.');
            if (jobPlatforms[baseDomain]) {
                return jobPlatforms[baseDomain];
            }
            return baseDomain;
        }
        
        return domain;
    } catch (e) {
        return 'unknown';
    }
}

// Get favicon URL with caching and fallback
function getFaviconUrl(domain) {
    if (faviconCache.has(domain)) {
        return faviconCache.get(domain);
    }
    
    // Try multiple favicon sources with fallbacks
    const faviconSources = [
        `https://www.google.com/s2/favicons?domain=${domain}&sz=16`,
        `https://favicon.yandex.net/favicon/${domain}`,
        `https://icons.duckduckgo.com/ip3/${domain}.ico`,
        `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiByeD0iNCIgZmlsbD0iI0QyRDJENyIvPgo8cGF0aCBkPSJNOCA0QzUuNzkwODYgNCA0IDUuNzkwODYgNCA4QzQgMTAuMjA5MSA1Ljc5MDg2IDEyIDggMTJDMTAuMjA5MSAxMiAxMiAxMC4yMDkxIDEyIDhDMTIgNS43OTA4NiAxMC4yMDkxIDQgOCA0WiIgZmlsbD0iIzZFNkU3MyIvPgo8L3N2Zz4K` // Default globe icon
    ];
    
    // Cache the first source as primary, others will be tried via onerror
    faviconCache.set(domain, faviconSources[0]);
    return faviconSources[0];
}



// Handle scroll for infinite loading
function handleScroll() {
    if (isLoadingMore || !hasMoreData) return;
    
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    // Load more when user is within 500px of bottom
    if (scrollTop + windowHeight >= documentHeight - 500) {
        loadMoreInternships();
    }
}

// Load more internships
async function loadMoreInternships() {
    if (isLoadingMore || !hasMoreData) return;
    
    isLoadingMore = true;
    showLoadingIndicator();
    
    try {
        currentPage++;
        
        // Simulate pagination by slicing the filtered data
        const startIndex = currentPage * PAGE_SIZE;
        const endIndex = startIndex + PAGE_SIZE;
        const nextBatch = filteredInternships.slice(startIndex, endIndex);
        
        if (nextBatch.length === 0) {
            hasMoreData = false;
        } else {
            renderInternshipRows(nextBatch, false); // Append mode
        }
        
    } catch (error) {
        console.error('Error loading more internships:', error);
        showToast('Failed to load more internships', 'error');
    } finally {
        isLoadingMore = false;
        hideLoadingIndicator();
    }
}

// Show loading indicator
function showLoadingIndicator() {
    const tbody = document.getElementById('internshipsBody');
    const loadingRow = document.createElement('tr');
    loadingRow.id = 'loadingMoreRow';
    loadingRow.innerHTML = `
        <td colspan="11" class="loading">
            <div class="loading-spinner"></div>
            Loading more internships...
        </td>
    `;
    tbody.appendChild(loadingRow);
}

// Hide loading indicator
function hideLoadingIndicator() {
    const loadingRow = document.getElementById('loadingMoreRow');
    if (loadingRow) {
        loadingRow.remove();
    }
}

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
    document.querySelectorAll('input[name="statusFilter"]').forEach(radio => radio.addEventListener('change', applyFilters));
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
    
    // Infinite scroll for pagination
    window.addEventListener('scroll', handleScroll);
}

// Setup table event listeners (called after rendering)
function setupTableEventListeners() {
    // Apply checkbox
    document.querySelectorAll('.apply-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const internshipId = this.dataset.jobId;
            const internship = allInternships.find(i => i.id === internshipId);
            if (!internship || !internship.id) {
                console.error('Invalid internship data:', {internshipId, internship});
                showToast('Error: Invalid job data', 'error');
                return;
            }
            toggleApplied(internshipId, this.checked);
        });
    });

    // Resume select
    document.querySelectorAll('.resume-select').forEach(select => {
        select.addEventListener('change', function() {
            const internshipId = this.dataset.jobId;
            const internship = allInternships.find(i => i.id === internshipId);
            if (!internship || !internship.id) {
                console.error('Invalid internship data:', {internshipId, internship});
                showToast('Error: Invalid job data', 'error');
                return;
            }
            selectResume(internshipId, this.value);
        });
    });

    // Notes button
    document.querySelectorAll('.notes-btn').forEach(button => {
        button.addEventListener('click', function() {
            const internshipId = this.dataset.jobId;
            const internship = allInternships.find(i => i.id === internshipId);
            if (!internship || !internship.id) {
                console.error('Invalid internship data:', {internshipId, internship});
                showToast('Error: Invalid job data', 'error');
                return;
            }
            openNotes(internshipId);
        });
    });
}

// Load internships from API
async function loadInternships(resetPagination = true) {
    try {
        if (resetPagination) {
            currentPage = 0;
            hasMoreData = true;
            isLoadingMore = false;
        }

        const response = await fetch(`${API_BASE}/internships`);
        if (!response.ok) throw new Error('Failed to load internships');

        allInternships = await response.json();
        filteredInternships = [...allInternships];
        
        if (resetPagination) {
            populateFilterDropdowns();
            renderInternships(true); // First load, replace all content
        } else {
            renderInternships(false); // Append new content
        }
        
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
    const statusFilter = document.querySelector('input[name="statusFilter"]:checked').value;
    const appliedOnly = document.getElementById('showAppliedFilter').checked;

    filteredInternships = allInternships.filter(internship => {
        if (selectedCategories.size > 0 && !selectedCategories.has(internship.category)) return false;
        if (selectedLocations.size > 0) {
            const internshipLocations = internship.full_locations && internship.full_locations.length > 0 
                ? internship.full_locations 
                : [internship.location];
            const hasMatchingLocation = internshipLocations.some(loc => selectedLocations.has(loc));
            if (!hasMatchingLocation) return false;
        }
        if (selectedCompanies.size > 0 && !selectedCompanies.has(internship.company)) return false;
        if (dateFrom && internship.date_posted < dateFrom) return false;
        if (dateTo && internship.date_posted > dateTo) return false;
        if (faangFilter === 'only' && !(internship.is_faang_plus === true || internship.is_faang_plus === 'True')) return false;
        if (faangFilter === 'exclude' && (internship.is_faang_plus === true || internship.is_faang_plus === 'True')) return false;
        if (phdFilter === 'only' && !internship.has_phd_emoji) return false;
        if (phdFilter === 'exclude' && internship.has_phd_emoji) return false;
        if (clearanceFilter === 'only' && !internship.has_clearance_emoji) return false;
        if (clearanceFilter === 'exclude' && internship.has_clearance_emoji) return false;
        if (statusFilter === 'active' && internship.is_active === false) return false;
        if (statusFilter === 'inactive' && internship.is_active !== false) return false;
        if (appliedOnly && !internship.applied) return false;
        return true;
    });

    // Reset pagination when filters change
    currentPage = 0;
    hasMoreData = true;
    isLoadingMore = false;
    
    populateFilterDropdowns();
    renderInternships(true); // Reset content
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
    document.querySelector('input[name="statusFilter"][value="all"]').checked = true;
    document.getElementById('showAppliedFilter').checked = false;

    applyFilters();
}

// Populate location and company dropdowns dynamically
function populateFilterDropdowns() {
    const locations = new Set();
    const companies = new Set();
    
    filteredInternships.forEach(internship => {
        // Add individual locations from full_locations array
        if (internship.full_locations && internship.full_locations.length > 0) {
            internship.full_locations.forEach(location => {
                locations.add(location);
            });
        } else {
            // Fallback to the location field if full_locations is not available
            locations.add(internship.location);
        }
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

// Render location with expandable functionality
function renderLocation(location, fullLocations) {
    if (!fullLocations || fullLocations.length <= 1) {
        return escapeHtml(location);
    }
    
    // Check if location has "+X more" format
    const match = location.match(/^(.+?)\s\+(\d+)\s+more$/);
    if (!match) {
        return escapeHtml(location);
    }
    
    const baseLocation = match[1];
    const moreCount = parseInt(match[2]);
    
    return `
        <div class="location-container">
            <span class="location-text">${escapeHtml(baseLocation)}</span>
            <button class="location-expand-btn" onclick="toggleLocations(this)">
                +${moreCount} more
            </button>
            <div class="location-full-list" style="display: none;">
                ${fullLocations.map(loc => `<div class="location-item">${escapeHtml(loc)}</div>`).join('')}
            </div>
        </div>
    `;
}

// Toggle location expansion
function toggleLocations(button) {
    const container = button.closest('.location-container');
    const fullList = container.querySelector('.location-full-list');
    const isExpanded = fullList.style.display !== 'none';
    
    if (isExpanded) {
        fullList.style.display = 'none';
        button.textContent = button.textContent.replace(/\d+ locations?/, (match) => {
            const count = parseInt(match) - 1;
            return `+${count} more`;
        });
    } else {
        fullList.style.display = 'block';
        const locationCount = fullList.querySelectorAll('.location-item').length;
        button.textContent = `${locationCount} locations`;
    }
}

// Render internships table
function renderInternships(resetContent = true) {
    const tbody = document.getElementById('internshipsBody');

    if (filteredInternships.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="no-results">No internships found</td></tr>';
        return;
    }

    // Get the batch to render
    const startIndex = resetContent ? 0 : currentPage * PAGE_SIZE;
    const endIndex = Math.min(startIndex + PAGE_SIZE, filteredInternships.length);
    const batch = filteredInternships.slice(startIndex, endIndex);

    console.log(`Rendering internships. Batch: ${startIndex}-${endIndex}, Total: ${filteredInternships.length}`);
    
    if (resetContent) {
        tbody.innerHTML = '';
    }
    
    renderInternshipRows(batch, resetContent);
}

// Render internship rows (separated for reuse)
function renderInternshipRows(internships, resetContent = true) {
    const tbody = document.getElementById('internshipsBody');
    
    const rowsHtml = internships.map((internship, index) => {
        const rowClass = internship.applied ? 'applied' : '';
        const inactiveClass = internship.is_active === false ? 'inactive' : '';
        return `
<tr class="${rowClass} ${inactiveClass}" data-job-id="${internship.id}">
            <td>
                <input type="checkbox"
                       class="apply-checkbox"
                       data-job-id="${internship.id}"
                       ${internship.applied ? 'checked' : ''}>
            </td>
             <td>
                 ${escapeHtml(internship.company)}
                 ${internship.is_faang_plus === 'True' ? '<span class="badge badge-faang">🔥 FAANG+</span>' : ''}
             </td>
             <td>${escapeHtml(stripEmojis(internship.role))}</td>
             <td class="location-cell" data-full-locations='${escapeHtml(JSON.stringify(internship.full_locations || []))}'>${renderLocation(internship.location, internship.full_locations || [])}</td>
             <td><span class="badge badge-category">${getCategoryName(internship.category)}</span></td>
             <td style="font-size: 18px; text-align: center;">${internship.emojis || ''}</td>
             <td>${formatDate(internship.date_posted)} ${internship.is_active === false ? '<span class="badge badge-inactive">Inactive</span>' : ''}</td>
             <td><span class="badge">${getSeasonLabel(internship.source_file)}</span></td>
            <td>
                <div class="link-group">
                    ${internship.base_url ? `
                        <a href="${escapeHtml(internship.base_url)}" target="_blank" class="link-item">
                            <img src="https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(internship.base_url)}&size=16" 
                                 alt="" class="favicon" 
                                 loading="lazy"
                                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiByeD0iNCIgZmlsbD0iI0QyRDJENyIvPgo8cGF0aCBkPSJNOCA0QzUuNzkwODYgNCA0IDUuNzkwODYgNCA4QzQgMTAuMjA5MSA1Ljc5MDg2IDEyIDggMTJDMTAuMjA5MSAxMiAxMiAxMC4yMDkxIDEyIDhDMTIgNS43OTA4NiAxMC4yMDkxIDQgOCA0WiIgZmlsbD0iIzZFNkU3MyIvPgo8L3N2Zz4K'">
                            <span class="domain-name">${extractDomain(internship.base_url)}</span>
                        </a>
                    ` : ''}
                    ${internship.application_url ? `
                        <a href="${escapeHtml(internship.application_url)}" target="_blank" class="link-item">
                            📝 Apply (Simplify)
                        </a>
                    ` : ''}
                </div>
            </td>
            <td>
                <select class="resume-select" data-job-id="${internship.id}">
                    <option value="">No resume</option>
                    ${allResumes.map(resume => '<option value="' + resume.hash + '" ' + (internship.resume_hash === resume.hash ? 'selected' : '') + '>' + escapeHtml(resume.original_filename) + '</option>').join('')}
                </select>
            </td>
            <td>
                <button class="btn btn-secondary btn-sm notes-btn" data-job-id="${internship.id}">
                    📝 Notes
                </button>
            </td>
        </tr>
 `
}).join('');

    if (resetContent) {
        tbody.innerHTML = rowsHtml;
    } else {
        tbody.insertAdjacentHTML('beforeend', rowsHtml);
    }

    // Add event listeners using event delegation
    setupTableEventListeners();
}

// Load favicons for all direct links
function loadFavicons() {
    const directLinks = document.querySelectorAll('.link-item[data-domain]');
    console.log('Found direct links:', directLinks.length);
    
    directLinks.forEach((link, index) => {
        const domain = link.dataset.domain;
        console.log(`Loading favicon for ${domain} (link ${index})`);
        
        const favicon = createFaviconElement(domain);
        link.insertBefore(favicon, link.firstChild);
    });
}

// Update stats
function updateStats() {
    document.getElementById('totalCount').textContent = filteredInternships.length;
    document.getElementById('appliedCount').textContent = filteredInternships.filter(i => i.applied).length;
    document.getElementById('faangCount').textContent = filteredInternships.filter(i => i.is_faang_plus === 'True').length;
}

// Toggle applied status
async function toggleApplied(internshipId, applied) {
    try {
        const response = await fetch(`${API_BASE}/internships/${encodeURIComponent(internshipId)}/apply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ applied })
        });

        if (!response.ok) throw new Error('Failed to update application status');

        // Update local state
        const internship = allInternships.find(i => i.id === internshipId);
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
async function selectResume(internshipId, resumeHash) {
    try {
        const response = await fetch(`${API_BASE}/internships/${encodeURIComponent(internshipId)}/apply`, {
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
        const internship = allInternships.find(i => i.id === internshipId);
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

function getSeasonLabel(sourceFile) {
    return sourceFile === 'README.md' ? 'S26' : 'W26';
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

function openNotes(internshipId) {
    const notes = prompt('Add notes for this application:');
    if (notes !== null) {
        updateNotes(internshipId, notes);
    }
}

async function updateNotes(internshipId, notes) {
    try {
        const response = await fetch(`${API_BASE}/internships/${encodeURIComponent(internshipId)}/apply`, {
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
