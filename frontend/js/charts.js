/**
 * CareerCompass-AI 2026 - Figma-Grade Dark UI Chart Visualizations (Chart.js)
 */

let activeCharts = {};

export function renderHollandRadar(canvasId, scores) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (activeCharts[canvasId]) {
        activeCharts[canvasId].destroy();
    }

    const labels = [
        "Kỹ thuật (R)",
        "Nghiên cứu (I)",
        "Sáng tạo (A)",
        "Xã hội (S)",
        "Quản lý (E)",
        "Nghiệp vụ (C)"
    ];

    const dataValues = [
        scores.R || 0,
        scores.I || 0,
        scores.A || 0,
        scores.S || 0,
        scores.E || 0,
        scores.C || 0
    ];

    activeCharts[canvasId] = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Sở thích Holland (%)',
                data: dataValues,
                backgroundColor: 'rgba(99, 102, 241, 0.35)',
                borderColor: '#818cf8',
                borderWidth: 2.5,
                pointBackgroundColor: '#c7d2fe',
                pointBorderColor: '#4f46e5',
                pointHoverRadius: 7,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: 'rgba(255, 255, 255, 0.08)' },
                    grid: { color: 'rgba(255, 255, 255, 0.08)' },
                    pointLabels: {
                        font: { size: 12, family: "'Plus Jakarta Sans', sans-serif", weight: '600' },
                        color: '#cbd5e1'
                    },
                    suggestedMin: 0,
                    suggestedMax: 100,
                    ticks: { stepSize: 25, backdropColor: 'transparent', color: '#64748b' }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

export function renderSCCTMatrix(canvasId, scctDimensions) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (activeCharts[canvasId]) {
        activeCharts[canvasId].destroy();
    }

    const colorMap = {
        "Vùng Hành động (Hành động)": "#10b981",    // Emerald
        "Vùng Phát triển": "#38bdf8",            // Sky Blue
        "Vùng Khám phá": "#fbbf24",              // Amber
        "Vùng Tránh né": "#94a3b8"               // Slate
    };

    const datasets = (scctDimensions || []).map(item => {
        const bg = colorMap[item.quadrant] || (item.quadrant.includes("Hành động") ? "#10b981" : "#38bdf8");
        return {
            label: item.dimension_name,
            data: [{ x: item.interest_score, y: item.confidence_score, label: item.dimension_name, quad: item.quadrant }],
            backgroundColor: bg,
            borderColor: bg,
            pointRadius: 8,
            pointHoverRadius: 11
        };
    });

    activeCharts[canvasId] = new Chart(ctx, {
        type: 'scatter',
        data: { datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: { display: true, text: 'Sở thích (%) →', font: { weight: 'bold', size: 11 }, color: '#94a3b8' },
                    min: 0, max: 100,
                    ticks: { color: '#64748b' },
                    grid: { color: (ctx) => ctx.tick.value === 50 ? '#f43f5e' : 'rgba(255, 255, 255, 0.06)', lineWidth: (ctx) => ctx.tick.value === 50 ? 1.5 : 1 }
                },
                y: {
                    title: { display: true, text: 'Niềm tin Tự tin (%) ↑', font: { weight: 'bold', size: 11 }, color: '#94a3b8' },
                    min: 0, max: 100,
                    ticks: { color: '#64748b' },
                    grid: { color: (ctx) => ctx.tick.value === 50 ? '#f43f5e' : 'rgba(255, 255, 255, 0.06)', lineWidth: (ctx) => ctx.tick.value === 50 ? 1.5 : 1 }
                }
            },
            plugins: {
                tooltip: {
                    backgroundColor: '#0f172a',
                    titleColor: '#f8fafc',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    padding: 10,
                    callbacks: {
                        label: function(context) {
                            const raw = context.raw;
                            return `${raw.label}: Sở thích ${raw.x}%, Tự tin ${raw.y}% (${raw.quad})`;
                        }
                    }
                },
                legend: { position: 'bottom', labels: { boxWidth: 10, color: '#94a3b8', font: { size: 11 } } }
            }
        }
    });
}

export function renderGardnerBar(canvasId, gardnerScores) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (activeCharts[canvasId]) {
        activeCharts[canvasId].destroy();
    }

    const labels = Object.keys(gardnerScores || {});
    const values = Object.values(gardnerScores || {});

    activeCharts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Mức độ nổi trội (%)',
                data: values,
                backgroundColor: [
                    '#6366f1', '#3b82f6', '#06b6d4', '#10b981',
                    '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'
                ],
                borderRadius: 8
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { min: 0, max: 100, ticks: { stepSize: 25, color: '#64748b' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                y: { ticks: { color: '#cbd5e1', font: { weight: '600' } }, grid: { display: false } }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0f172a',
                    titleColor: '#f8fafc',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1
                }
            }
        }
    });
}
