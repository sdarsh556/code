import { X, TrendingUp, Activity } from 'lucide-react';
import '../../../css/analytics/ecs/CPUGraphModal.css';

function CPUGraphModal({ service, selectedDate, onClose }) {
    // Mock 30-day CPU data - will be replaced with API
    const generateCPUData = () => {
        const data = [];
        const today = new Date();

        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);

            // Generate realistic CPU values with some variation
            const baseCPU = service.cpu;
            const variation = (Math.random() - 0.5) * 20;
            const cpuValue = Math.max(10, Math.min(95, baseCPU + variation));

            data.push({
                date: date.toISOString().split('T')[0],
                cpu: parseFloat(cpuValue.toFixed(1)),
                isSelected: date.toISOString().split('T')[0] === selectedDate
            });
        }

        return data;
    };

    const cpuData = generateCPUData();
    const maxCPU = Math.max(...cpuData.map(d => d.cpu));
    const minCPU = Math.min(...cpuData.map(d => d.cpu));
    const avgCPU = (cpuData.reduce((sum, d) => sum + d.cpu, 0) / cpuData.length).toFixed(1);

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="cpu-modal-overlay" onClick={onClose}>
            <div className="cpu-modal-content" onClick={(e) => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="cpu-modal-header">
                    <div className="modal-title-section">
                        <TrendingUp size={24} />
                        <div>
                            <h2>CPU Utilization - 30 Days</h2>
                            <p>{service.serviceName}</p>
                        </div>
                    </div>
                    <button className="modal-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Stats Row */}
                <div className="cpu-stats-row">
                    <div className="cpu-stat">
                        <span className="cpu-stat-label">Average</span>
                        <span className="cpu-stat-value">{avgCPU}%</span>
                    </div>
                    <div className="cpu-stat">
                        <span className="cpu-stat-label">Peak</span>
                        <span className="cpu-stat-value peak">{maxCPU.toFixed(1)}%</span>
                    </div>
                    <div className="cpu-stat">
                        <span className="cpu-stat-label">Minimum</span>
                        <span className="cpu-stat-value low">{minCPU.toFixed(1)}%</span>
                    </div>
                    <div className="cpu-stat">
                        <span className="cpu-stat-label">Current</span>
                        <span className="cpu-stat-value current">{service.cpu}%</span>
                    </div>
                </div>

                {/* Graph */}
                <div className="cpu-graph-container">
                    <div className="cpu-graph-bars">
                        {cpuData.map((dataPoint, index) => (
                            <div
                                key={dataPoint.date}
                                className="cpu-bar-wrapper"
                                title={`${formatDate(dataPoint.date)}: ${dataPoint.cpu}%`}
                            >
                                <div
                                    className={`cpu-bar ${dataPoint.isSelected ? 'selected' : ''}`}
                                    style={{ height: `${dataPoint.cpu}%` }}
                                />
                                {dataPoint.isSelected && (
                                    <div className="selected-label">{formatDate(dataPoint.date)}</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Legend */}
                <div className="cpu-legend">
                    <div className="legend-item">
                        <div className="legend-dot normal"></div>
                        <span>Normal</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-dot selected"></div>
                        <span>Selected Date</span>
                    </div>
                    <div className="legend-item">
                        <Activity size={14} />
                        <span>30-Day History</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CPUGraphModal;
