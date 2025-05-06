import { Divider, List, ListItem, useTheme, Stack } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import MenuItem from "@mui/material/MenuItem";
import { useContacts } from "../../hooks/users";
import { useState } from "react";
import { useChannels } from "../../hooks/channels";
import { useHome } from "./context";

const HomeSidebar = ({ onSelect, sx }) => {
    const { contacts } = useContacts();
    const { channels } = useChannels();
    const { palette } = useTheme();
    const { selectedModel, type, setSelected } = useHome();
    const [selected, setSelectedID] = useState(-1);

    /**
     * Create id by user or channel type
     * @param {"user"|"channel"} type
     * @param {number} id
     * @returns {string}
     */
    const ID = (type, id) => {
        return `${type}_${id}`;
    };

    const handleSelect = (type, id) => () => {
        setSelectedID(ID(type, id));
    };

    return (
        <List
            sx={{
                border: 1,
                background: (theme) => theme.palette.primary.light,
                color: (theme) => theme.palette.primary.contrastText,
                ...sx,
            }}
        >
            <ListItem>مخاطبین شما</ListItem>
            <Divider />
            {contacts.map((contact) => (
                <MenuItem
                    value={ID("user", contact.id)}
                    key={ID("user", contact.id)}
                    onClick={handleSelect("user", contact.id)}
                    selected={ID("user", contact.id) === selected}
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
