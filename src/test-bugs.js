// This file is designed to test custom AI rules from PR_RULES.md

// VIOLATION 1: Async function without try/catch block
export async function fetchUserData(userId) {
    const response = await fetch(`/api/users/${userId}`);
    const data = await response.json();
    return data;
}

// VIOLATION 2: Utility function placed here instead of utils/ folder
export function formatDate(dateString) {
    // VIOLATION 3: Using 'let' when 'const' would suffice
    let d = new Date(dateString);
    let day = d.getDate();
    let month = d.getMonth() + 1;
    let year = d.getFullYear();

    return `${day}/${month}/${year}`;
}
