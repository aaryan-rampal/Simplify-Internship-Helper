// API Base URL
const API_BASE = 'http://localhost:8000/api';

// Global state
let allInternships = [];
let filteredInternships = [];
let allResumes = [];
let currentJobIdForResume = null;

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    await loadInternships();
    await loadResumes();
    setupEventListeners();
    updateStats();
});

// Setup event listeners
function setupEventListeners() {
    // Filters
    document.getElementById('categoryFilter').addEventListener('change', applyFilters);
    document.getElementById('locationFilter').addEventListener('input', debounce(applyFilters, 300));
    document.getElementById('companyFilter').addEventListener('input', debounce(applyFilters, 300));
    document.getElementById('dateFromFilter').addEventListener('change', applyFilters);
    document.getElementById('dateToFilter').addEventListener('change', applyFilters);
    document.getElementById('faangFilter').addEventListener('change', applyFilters);
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
}

// Setup table event listeners (called after rendering)
function setupTableEventListeners() {
    // Apply checkbox
    document.querySelectorAll('.apply-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const index = parseInt(this.dataset.jobIndex);
            const internship = filteredInternships[index];
            toggleApplied(internship.job_id, this.checked);
        });
    });

    // Resume select
    document.querySelectorAll('.resume-select').forEach(select => {
        select.addEventListener('change', function() {
            const index = parseInt(this.dataset.jobIndex);
            const internship = filteredInternships[index];
            selectResume(internship.job_id, this.value);
        });
    });

    // Notes button
    document.querySelectorAll('.notes-btn').forEach(button => {
        button.addEventListener('click', function() {
            const index = parseInt(this.dataset.jobIndex);
            const internship = filteredInternships[index];
            openNotes(internship.job_id);
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
    const category = document.getElementById('categoryFilter').value;
    const location = document.getElementById('locationFilter').value.toLowerCase();
    const company = document.getElementById('companyFilter').value.toLowerCase();
    const dateFrom = document.getElementById('dateFromFilter').value;
    const dateTo = document.getElementById('dateToFilter').value;
    const faangOnly = document.getElementById('faangFilter').checked;
    const appliedOnly = document.getElementById('showAppliedFilter').checked;

    filteredInternships = allInternships.filter(internship => {
        if (category && internship.category !== category) return false;
        if (location && !internship.location.toLowerCase().includes(location)) return false;
        if (company && !internship.company.toLowerCase().includes(company)) return false;
        if (dateFrom && internship.date_posted < dateFrom) return false;
        if (dateTo && internship.date_posted > dateTo) return false;
        if (faangOnly && internship.is_faang_plus !== 'True') return false;
        if (appliedOnly && !internship.applied) return false;
        return true;
    });

    renderInternships();
    updateStats();
}

// Reset filters
function resetFilters() {
    document.getElementById('categoryFilter').value = '';
    document.getElementById('locationFilter').value = '';
    document.getElementById('companyFilter').value = '';
    document.getElementById('dateFromFilter').value = '';
    document.getElementById('dateToFilter').value = '';
    document.getElementById('faangFilter').checked = false;
    document.getElementById('showAppliedFilter').checked = false;
    applyFilters();
}

// Render internships table
function renderInternships() {
    const tbody = document.getElementById('internshipsBody');

    if (filteredInternships.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="no-results">No internships found</td></tr>';
        return;
    }

    tbody.innerHTML = filteredInternships.map((internship, index) => `
        <tr class="${internship.applied ? 'applied' : ''}" data-job-index="${index}">
            <td>
                <input type="checkbox"
                       class="apply-checkbox"
                       data-job-index="${index}"
                       ${internship.applied ? 'checked' : ''}>
            </td>
            <td>
                ${escapeHtml(internship.company)}
                ${internship.is_faang_plus === 'True' ? '<span class="badge badge-faang">🔥 FAANG+</span>' : ''}
            </td>
            <td>${escapeHtml(internship.role)}</td>
            <td>${escapeHtml(internship.location)}</td>
            <td><span class="badge badge-category">${getCategoryName(internship.category)}</span></td>
            <td>${formatDate(internship.date_posted)}</td>
            <td>
                <div class="link-group">
                    ${internship.base_url ? `<a href="${escapeHtml(internship.base_url)}" target="_blank">🔗 Direct Link</a>` : ''}
                    ${internship.application_url ? `<a href="${escapeHtml(internship.application_url)}" target="_blank">📝 Apply (Simplify)</a>` : ''}
                </div>
            </td>
            <td>
                <select class="resume-select" data-job-index="${index}">
                    <option value="">No resume</option>
                    ${allResumes.map(resume => `
                        <option value="${resume.hash}" ${internship.resume_hash === resume.hash ? 'selected' : ''}>
                            ${escapeHtml(resume.original_filename)}
                        </option>
                    `).join('')}
                </select>
            </td>
            <td>
                <button class="btn btn-secondary btn-sm notes-btn" data-job-index="${index}">
                    📝 Notes
                </button>
            </td>
        </tr>
    `).join('');

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
