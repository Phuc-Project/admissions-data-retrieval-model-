/**
 * CareerCompass-AI 2026 - Chart Visualizations (Chart.js)
 */

let activeCharts = {};

export function renderHollandRadar(canvasId, scores) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (activeCharts[canvasId]) {
        activeCharts[canvasId].destroy();
    }

    const labels = [
        "R - Kỹ thuật (Realistic)",
        "I - Nghiên cứu (Investigative)",
        "A - Sáng tạo (Artistic)",
        "S - Xã hội (Social)",
        "E - Quản lý (Enterprising)",
        "C - Nghiệp vụ (Conventional)"
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
                label: 'Điểm số Sở thích Holland (%)',
                data: dataValues,
                backgroundColor: 'rgba(59, 130, 246, 0.25)',
                borderColor: 'rgba(37, 99, 235, 1)',
                borderWidth: 2.5,
                pointBackgroundColor: 'rgba(29, 78, 216, 1)',
                pointBorderColor: '#fff',
                pointHoverRadius: 6,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: 'rgba(156, 163, 175, 0.2)' },
                    grid: { color: 'rgba(156, 163, 175, 0.2)' },
                    pointLabels: {
                        font: { size: 12, family: "'Plus Jakarta Sans', sans-serif", weight: '600' },
                        color: '#1e293b'
                    },
                    suggestedMin: 0,
                    suggestedMax: 100,
                    ticks: { stepSize: 20, backdropColor: 'transparent', color: '#64748b' }
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
        "Vùng Hành động (Hành động)": "#10b981",    // Green
        "Vùng Phát triển": "#3b82f6",            // Blue
        "Vùng Khám phá": "#f59e0b",              // Amber
        "Vùng Tránh né": "#94a3b8"               // Gray
    };

    const datasets = (scctDimensions || []).map(item => {
        const bg = colorMap[item.quadrant] || (item.quadrant.includes("Hành động") ? "#10b981" : "#3b82f6");
        return {
            label: item.dimension_name,
            data: [{ x: item.interest_score, y: item.confidence_score, label: item.dimension_name, quad: item.quadrant }],
            backgroundColor: bg,
            borderColor: bg,
            pointRadius: 9,
            pointHoverRadius: 12
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
                    title: { display: true, text: 'Mức độ Sở thích (%) →', font: { weight: 'bold' } },
                    min: 0, max: 100,
                    grid: { color: (ctx) => ctx.tick.value === 50 ? '#ef4444' : 'rgba(203, 213, 225, 0.3)', lineWidth: (ctx) => ctx.tick.value === 50 ? 2 : 1 }
                },
                y: {
                    title: { display: true, text: 'Niềm tin Tự tin Năng lực (%) ↑', font: { weight: 'bold' } },
                    min: 0, max: 100,
                    grid: { color: (ctx) => ctx.tick.value === 50 ? '#ef4444' : 'rgba(203, 213, 225, 0.3)', lineWidth: (ctx) => ctx.tick.value === 50 ? 2 : 1 }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const raw = context.raw;
                            return `${raw.label}: Sở thích ${raw.x}%, Tự tin ${raw.y}% (${raw.quad})`;
                        }
                    }
                },
                legend: { position: 'bottom', labels: { boxWidth: 12 } }
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
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { min: 0, max: 100, ticks: { stepSize: 25 } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}
