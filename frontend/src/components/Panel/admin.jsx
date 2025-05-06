import {
    Box,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
} from "@mui/material";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import CreateChannel from "../Channels/create";
import { useState } from "react";

const AdminPanel = ({ open, onClose }) => {
    const [openCreateChannel, setOpenCreateChannel] = useState(false);

    const handleOpenCreateChannel = () => setOpenCreateChannel(true);

    return (
        <Dialog disablePortal open={open} onClose={onClose}>
            <CreateChannel
                open={openCreateChannel}
                onClose={() => setOpenCreateChannel(false)}
            />
            <DialogTitle>مدریت پیام رسان</DialogTitle>
            <DialogContent>
                <Stack minWidth="250px">
                    <Button
                        startIcon={<AddCircleOutlineIcon />}
                        variant="outlined"
                        onClick={handleOpenCreateChannel}
                    >
                        افزودن گروه
                    </Button>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button variant="contained" onClick={onClose}>
                    بستن
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AdminPanel;
