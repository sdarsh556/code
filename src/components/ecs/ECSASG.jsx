import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";

import {
    Container,
    Search,
    RefreshCw,
    Server,
    Activity,
    StopCircle,
    ChevronLeft,
    X,
} from "lucide-react";

import ECSIcon from "../common/ECSIcon";
import "../../css/ecs/ECS.css";
import axiosClient from "../api/axiosClient";
import ConfirmActionModal from "../common/ConfirmActionModal";

function ECSASG() {
    // ✅ Route param
    const { clusterName } = useParams();

    // ✅ Navigation hook
    const navigate = useNavigate();

    const [searchQuery, setSearchQuery] = useState("");

    // ✅ Backend returns single ASG object
    const [asgData, setAsgData] = useState(null);

    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState(null);

    // ==============================
    // ✅ EDIT MODAL STATE
    // ==============================
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const [editForm, setEditForm] = useState({
        min: 0,
        desired: 0,
        max: 0,
    });

    // ==============================
    // ✅ CONFIRM MODAL STATE
    // ==============================
    const [confirmModal, setConfirmModal] = useState({
        open: false,
        message: "",
        onConfirm: null,
    });

    const closeConfirmModal = () => {
        setConfirmModal({ open: false, message: "", onConfirm: null });
    };

    // ============================================================
    // ✅ FETCH ASG DATA
    // ============================================================
    const fetchASGData = useCallback(async () => {
        try {
            setError(null);

            console.log("Fetching ASG for cluster:", clusterName);

            const response = await axiosClient.get(
                `/ecs/asg/cluster?clusterName=${encodeURIComponent(clusterName)}`
            );

            if (!response.data?.success) {
                throw new Error("Failed to fetch ASG data");
            }

            setAsgData(response.data.data);
        } catch (err) {
            console.error("❌ ASG fetch failed:", err);
            setError(err.message);
        }
    }, [clusterName]);

    useEffect(() => {
        fetchASGData();
    }, [fetchASGData]);

    // ============================================================
    // ✅ CARD VALUES (Min / Desired / Max)
    // ============================================================
    const stats = useMemo(() => {
        if (!asgData) {
            return { min: "-", desired: "-", max: "-" };
        }

        return {
            min: asgData.min_capacity,
            desired: asgData.desired_capacity,
            max: asgData.max_capacity,
        };
    }, [asgData]);

    // ============================================================
    // ✅ SYNC ASG
    // ============================================================
    const handleSync = async () => {
        setConfirmModal({
            open: true,
            message: "Sync ASG data from AWS? This may take a few minutes.",
            onConfirm: async () => {
                closeConfirmModal();
                setIsSyncing(true);

                try {
                    await axiosClient.post(
                        `/ecs/asg/sync?clusterName=${encodeURIComponent(clusterName)}`
                    );

                    await fetchASGData();
                } catch (err) {
                    setError("Failed to sync ASG data");
                } finally {
                    setIsSyncing(false);
                }
            },
        });
    };

    // ============================================================
    // ✅ OPEN EDIT MODAL
    // ============================================================
    const openEditModal = () => {
        if (!asgData) return;

        setEditForm({
            min: asgData.min_capacity,
            desired: asgData.desired_capacity,
            max: asgData.max_capacity,
        });

        setIsEditModalOpen(true);
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
    };

    // ============================================================
    // ✅ VALIDATION
    // ============================================================
    const isFormValid =
        Number(editForm.min) <= Number(editForm.desired) &&
        Number(editForm.desired) <= Number(editForm.max);

    // ============================================================
    // ✅ UPDATE ASG CAPACITY API
    // ============================================================
    const handleUpdateCapacity = async () => {
        if (!asgData) return;

        try {
            await axiosClient.put(
                `/ecs/asg/update-capacity?asgName=${encodeURIComponent(
                    asgData.asg_name
                )}`,
                {
                    min_capacity: Number(editForm.min),
                    desired_capacity: Number(editForm.desired),
                    max_capacity: Number(editForm.max),
                }
            );

            closeEditModal();
            await fetchASGData();
        } catch (err) {
            console.error("❌ Failed to update ASG capacity:", err);
            setError("Failed to update ASG capacity");
        }
    };

    // ============================================================
    // ✅ FILTER INSTANCES (NEW JSON FORMAT)
    // ============================================================
    const filteredInstances =
        asgData?.running_instances?.filter((instance) =>
            instance.instance_id
                ?.toLowerCase()
                .includes(searchQuery.toLowerCase())
        ) || [];

    // ============================================================
    // ✅ UI RENDER
    // ============================================================
    return (
        <div className="ecs-page">
            {/* ================= HEADER ================= */}
            <div className="page-header-modern">
                <div className="header-content-cluster">
                    {/* LEFT SIDE */}
                    <div className="header-left-cluster">
                        <div className="header-icon-modern">
                            <ECSIcon className="header-icon-svg" />
                        </div>

                        <div className="header-text">
                            {/* ✅ BACK TO SERVICES BUTTON (Like ECSService Page) */}
                            <button
                                className="back-link-modern"
                                onClick={() => navigate(`/ecs/${clusterName}`)}
                            >
                                <ChevronLeft size={16} />
                                BACK TO SERVICES
                            </button>

                            {/* Title */}
                            <h1 className="page-title-modern">
                                {asgData?.asg_name || "Loading ASG..."}
                            </h1>

                            {/* Subtitle + Status Tag */}
                            <p className="page-subtitle-modern">
                                Cluster: <strong>{clusterName}</strong>

                                {asgData?.status && (
                                    <span className="status-tag-modern">
                                        {(asgData.status || 'unknown').toUpperCase()}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ================= CARDS ================= */}
            <div className="stats-actions-container">
                <div className="stats-cards-modern">
                    {/* Min */}
                    <div className="stat-card-modern stat-primary-modern">
                        <div className="stat-icon-modern">
                            <StopCircle size={26} />
                        </div>
                        <div className="stat-content-modern">
                            <h3 className="stat-value-modern">{stats.min}</h3>
                            <p className="stat-label-modern">Min Capacity</p>
                        </div>
                    </div>

                    {/* Desired */}
                    <div className="stat-card-modern stat-success-modern">
                        <div className="stat-icon-modern">
                            <Activity size={26} />
                        </div>
                        <div className="stat-content-modern">
                            <h3 className="stat-value-modern">{stats.desired}</h3>
                            <p className="stat-label-modern">Desired Capacity</p>
                        </div>
                    </div>

                    {/* Max */}
                    <div className="stat-card-modern stat-info-modern">
                        <div className="stat-icon-modern">
                            <Server size={26} />
                        </div>
                        <div className="stat-content-modern">
                            <h3 className="stat-value-modern">{stats.max}</h3>
                            <p className="stat-label-modern">Max Capacity</p>
                        </div>
                    </div>
                </div>

                {/* Buttons */}
                <div className="action-buttons-modern">
                    <button
                        className={`action-btn-modern btn-sync ${isSyncing ? "syncing" : ""
                            }`}
                        onClick={handleSync}
                        disabled={isSyncing}
                    >
                        <RefreshCw size={18} className={isSyncing ? "spinning" : ""} />
                        <span>{isSyncing ? "Syncing..." : "Sync ASG"}</span>
                    </button>

                    <button className="action-btn-modern btn-upload" onClick={openEditModal}>
                        Update ASG
                    </button>
                </div>
            </div>

            {/* ================= SEARCH ================= */}
            <div className="search-bar-modern">
                <Search size={18} className="search-icon-modern" />
                <input
                    type="text"
                    placeholder="Search Instance ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input-modern"
                />
            </div>

            {/* ================= TABLE ================= */}
            <div className="clusters-table-modern">
                <div className="table-header-modern">
                    <h3 className="table-title">Running Instances</h3>
                </div>

                <div className="table-container-modern">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Instance ID</th>
                                <th>Instance Type</th>
                                <th>Health Status</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredInstances.length > 0 ? (
                                filteredInstances.map((inst) => (
                                    <tr key={inst.instance_id}>
                                        <td>{inst.instance_id}</td>
                                        <td>{inst.compute_type}</td>
                                        <td>{inst.health_status}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="3" style={{ textAlign: "center" }}>
                                        No Instances Found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {!asgData && (
                        <div className="empty-state-modern">
                            <Container size={70} className="empty-icon-modern" />
                            <h3>No ASG Data Found</h3>
                            <p>Please sync the ASG first.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ================= EDIT MODAL ================= */}
            {isEditModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <div className="modal-header">
                            <h2>Edit ASG Capacity</h2>
                            <X className="close-icon" onClick={closeEditModal} />
                        </div>

                        <div className="modal-body">
                            <label>Min Capacity</label>
                            <input
                                type="number"
                                value={editForm.min}
                                onChange={(e) =>
                                    setEditForm({ ...editForm, min: e.target.value })
                                }
                            />

                            <label>Desired Capacity</label>
                            <input
                                type="number"
                                value={editForm.desired}
                                onChange={(e) =>
                                    setEditForm({ ...editForm, desired: e.target.value })
                                }
                            />

                            <label>Max Capacity</label>
                            <input
                                type="number"
                                value={editForm.max}
                                onChange={(e) =>
                                    setEditForm({ ...editForm, max: e.target.value })
                                }
                            />

                            {!isFormValid && (
                                <p style={{ color: "red", marginTop: "10px" }}>
                                    Validation Error: Min ≤ Desired ≤ Max
                                </p>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button onClick={closeEditModal}>Cancel</button>

                            <button disabled={!isFormValid} onClick={handleUpdateCapacity}>
                                Update Capacity
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= CONFIRM MODAL ================= */}
            <ConfirmActionModal
                isOpen={confirmModal.open}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={closeConfirmModal}
            />
        </div>
    );
}

export default ECSASG;
