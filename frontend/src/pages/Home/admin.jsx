import { useState } from "react";
import AdminPanel from "../../components/Panel/admin";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { IconButton } from "@mui/material";

const AdminButton = () => {
    const [showAdminPanel, setShowAdminPanel] = useState(false);

    const handleShowAdminPanel = () => {
        setShowAdminPanel(true);
    };

    const handleCloseAdminPanel = () => {
        setShowAdminPanel(false);
    };

    return (
        <>
            <AdminPanel open={showAdminPanel} onClose={handleCloseAdminPanel} />
            <IconButton
                sx={{
                    position: "absolute",
                    bottom: 15,
                    right: 15,
                    color: (theme) => theme.palette.primary.contrastText,
                }}
                size="large"
                onClick={handleShowAdminPanel}
            >
                <AdminPanelSettingsIcon fontSize="large" />
            </IconButton>
            ;
        </>
    );
};

export default AdminButton;
