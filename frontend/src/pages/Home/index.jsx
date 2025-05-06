import Page from "../";
import { Grid, IconButton } from "@mui/material";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import HomeSidebar from "./sidebar";
import { useState } from "react";
import AdminPanel from "../../components/Panel/admin";

const HomePage = () => {
    const [showAdminPanel, setShowAdminPanel] = useState(false);

    const handleShowAdminPanel = () => {
        setShowAdminPanel(true);
    };

    const handleCloseAdminPanel = () => {
        setShowAdminPanel(false);
    };

    return (
        <Page title="صفحه اصلی">
            <AdminPanel open={showAdminPanel} onClose={handleCloseAdminPanel} />
            <Grid container direction="row" padding={5} height="100vh">
                <Grid size={3} sx={{ display: "flex" }} position="relative">
                    <HomeSidebar sx={{ width: "100%" }} />
                    <IconButton
                        sx={{
                            position: "absolute",
                            bottom: 15,
                            right: 15,
                            color: (theme) =>
                                theme.palette.primary.contrastText,
                        }}
                        size="large"
                        onClick={handleShowAdminPanel}
                    >
                        <AdminPanelSettingsIcon fontSize="large" />
                    </IconButton>
                </Grid>
                <Grid
                    size={9}
                    sx={{
                        borderColor: (theme) => theme.palette.primary.main,
                        borderStyle: "solid",
                        borderWidth: 1,
                    }}
                ></Grid>
            </Grid>
        </Page>
    );
};

export default HomePage;
