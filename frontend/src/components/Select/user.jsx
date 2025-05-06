import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import {useEffect, useState} from "react";
import {getContacts} from "../../api";

const UserSelect = (props) => {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        getContacts(token).then(setUsers);
    }, []);

    return <Select variant="outlined" {...props}>
        {users.map((user) => (<MenuItem key={`user_${user.id}`} value={user.id}>
                {user.name}
            </MenuItem>
        ))}
    </Select>
}

export default UserSelect;