import { Divider, List, ListItem, useTheme, Stack } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import MenuItem from "@mui/material/MenuItem";
import { useContacts } from "../../hooks/users";
import { useState } from "react";
import { useChannels } from "../../hooks/channels";

const HomeSidebar = (props) => {
    const { contacts } = useContacts();
    const { channels } = useChannels();
    const { palette } = useTheme();
    const [selected, setSelected] = useState(-1);

    return (
        <List
            {...props}
            sx={{
                border: 1,
                background: (theme) => theme.palette.primary.light,
                color: (theme) => theme.palette.primary.contrastText,
                ...props.sx,
            }}
        >
            <ListItem>مخاطبین شما</ListItem>
            <Divider />
            {contacts.map((contact) => (
                <MenuItem
                    value={contact.id}
                    key={`user_${contact.id}`}
                    onClick={() => setSelected(contact.id)}
                    selected={contact.id === selected}
                >
                    <Stack direction="row" gap={1}>
                        <PersonIcon />
                        {contact.name}
                    </Stack>
                </MenuItem>
            ))}
            <Divider />
            <ListItem>کانال های شما</ListItem>
            {channels?.map((channel) => (
                <MenuItem
                    value={channel.id}
                    key={`channel_${channel.id}`}
                    onClick={() => setSelected(channel.id)}
                    selected={channel.id === selected}
                >
                    <Stack direction="row" gap={1}>
                        <PersonIcon />
                        {channel.name}
                    </Stack>
                </MenuItem>
            ))}
        </List>
    );
};

export default HomeSidebar;
