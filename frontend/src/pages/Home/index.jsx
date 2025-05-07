import Page from "../";
import { Grid, IconButton } from "@mui/material";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import HomeSidebar from "./sidebar";
import { useState } from "react";
import AdminPanel from "../../components/Panel/admin";
import AdminButton from "./admin";
import HomeHeader from "./header";
import { HomeProvider } from "./context";
import Chat from "./chat";

const HomePage = () => {
    return (
        <Page title="صفحه اصلی">
            <HomeProvider>
                <Grid container direction="row" padding={5} height="100vh">
                    <Grid size={3} sx={{ display: "flex" }} position="relative">
                        <HomeSidebar sx={{ width: "100%" }} />
                        <AdminButton />
                    </Grid>
                    <Grid
                        size={9}
                        sx={{
                            borderColor: (theme) => theme.palette.primary.main,
                            borderStyle: "solid",
                            borderWidth: 1,
                        }}
                    >
                        <HomeHeader />
                        <Chat />
                    </Grid>
                </Grid>
            </HomeProvider>
        </Page>
    );
};

export default HomePage;
