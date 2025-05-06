import { Dialog, DialogContent, DialogTitle, TextField } from "@mui/material";
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import DialogActions from '@mui/material/DialogActions';
import { useState } from "react";
import { createChannel } from "../../api";
import UserSelect from "../Select/user";
import { toast } from "react-toastify";


/**
 *
 * @param props {{open: boolean, onClose?: () => void}}
 * @returns {JSX.Element}
 * @constructor
 */
const CreateChannel = (props) => {
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [members, setMembers] = useState([]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const token = localStorage.getItem('adminToken');

        if (!members?.length) {
            alert("کانال به صورت خالی قابل ایجاد نیست")
            return
        }

        setLoading(true);

        createChannel(token, {
            name,
            description,
            members,
        }).then((response) => {
            console.log(response);
            console.info('handleSubmit: success create channel:', response)
            toast.success(response.message);
            props.onClose?.();
        }).catch((error) => {
            toast.error(error?.data?.error || 'خطای نامشخص رخ داده است');
            console.error('handleSubmit: create channel error:', error);
        }).finally(() => {
            setLoading(false);
        });
    }

    return <Dialog disablePortal open={props.open} onClose={props.onClose}>
        <form onSubmit={handleSubmit}>
            <DialogTitle>ایجاد کانال جدید</DialogTitle>
            <DialogContent>
                <Stack direction="column" gap={2} pt={1}>
                    <TextField required label="عنوان" value={name} onChange={(e) => setName(e.target.value)} />
                    <TextField
                        label="توضیحات"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        multiline
                        minRows={2}
                    />
                    <UserSelect onChange={(e) => setMembers(e.target.value)} value={members} multiple />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button disabled={loading} variant="outlined" onClick={props.onClose}>
                    بستن
                </Button>

                <Button loading={loading} variant="contained" type="submit">
                    ایجاد
                </Button>
            </DialogActions>
        </form>
    </Dialog>
}

export default CreateChannel;