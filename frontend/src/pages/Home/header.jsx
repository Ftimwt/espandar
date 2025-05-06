import { Stack, Typography } from "@mui/material";

/**
 *
 * @param {{model: {name: string, id: number}, type: "channel"|"group"|"user"}} props
 * @returns
 */
const HomeHeader = ({ model, type }) => {
    if (!model) return <></>;
    return (
        <Stack bgcolor={(theme) => theme.palette.primary.light}>
            <Typography>{model.name}</Typography>
        </Stack>
    );
};

export default HomeHeader;
