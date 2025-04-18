import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
  Select,
  MenuItem,
  IconButton,
} from "@mui/material";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
import { styled } from "@mui/material/styles";

import { ActionPropertiesTable } from "./ActionPropertiesTable";
import { ActionTableRow } from "./FeatureActionTableRow";
import {
  MSBActionName,
  defaultDotProps,
  defaultCircleProps,
  defaultTextBoxProps,
  defaultConnectorProperties,
} from "../actions";

const getInitialProperties = (action: MSBActionName) => {
  switch (action) {
    case MSBActionName.DOT:
      return defaultDotProps;
    case MSBActionName.CIRCLE:
      return defaultCircleProps;
    case MSBActionName.TEXT_BOX:
      return defaultTextBoxProps;
    case MSBActionName.CONNECTOR:
      return defaultConnectorProperties;
    default:
      return {};
  }
};

// Define styled components to replace makeStyles
const StyledTable = styled(Table)({
  width: "100%",
  borderCollapse: "collapse",
});

const StyledTableRow = styled(TableRow)({
  // No specific styling needed
});

const StyledTableCell = styled(TableCell)({
  fontSize: "12px",
});

// Style constants to use with sx prop
const styles = {
  actionCell: {
    width: "20%",
    fontSize: "12px",
    padding: "4px",
  },
  propertyCell: {
    width: "80%",
    fontSize: "12px",
    padding: "2px",
  },
  selectField: {
    height: "30px",
  },
  removeIcon: {
    color: "red",
  },
  addIcon: {
    color: "green",
  },
};

interface ActionTableProps {
  data: ActionTableRow[];
  setData: React.Dispatch<React.SetStateAction<ActionTableRow[]>>;
}

export const ActionTable: React.FC<ActionTableProps> = ({ data, setData }) => {
  console.log("ActionTable: re-rendered");

  // No need for useStyles() with the new approach
  const [rows, setRows] = useState<ActionTableRow[]>(data);

  // this effect will trigger whenever data (input argument) changes
  useEffect(() => {
    setRows(data); // updating state directly
  }, [data]); // trigger effect when data changes

  const handleAddRow = () => {
    setRows([
      ...rows,
      { action: MSBActionName.DOT, properties: defaultDotProps },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    const newRows = [...rows];
    newRows.splice(index, 1);
    setRows(newRows);
  };

  const handleActionChange = (index: number, action: MSBActionName) => {
    console.log("ActionTable: index = ", index, ", action = ", action);

    const newRows = [...rows];
    newRows[index].action = action; // create a new object for the row;
    newRows[index].properties = getInitialProperties(action);
    setRows(newRows);
  };

  const handlePropertyChange = (index: number, properties: any) => {
    console.log("ActionTable: index = ", index, ", properties = ", properties);

    const newRows = [...rows];
    newRows[index].properties = properties;
    setRows(newRows);
  };

  return (
    <div>
      <StyledTable>
        {/* 
        <TableHead>
          <TableRow>
            <TableCell>Action</TableCell>

            <TableCell>Properties</TableCell>
          </TableRow>
        </TableHead> 
        */}
        <TableBody>
          {rows?.map((row, index) => (
            <StyledTableRow key={index}>
              {/* Action */}
              <StyledTableCell sx={styles.actionCell}>
                <IconButton
                  onClick={() => handleRemoveRow(index)}
                  aria-label="delete"
                >
                  <RemoveIcon sx={styles.removeIcon} />
                </IconButton>
                <Select
                  sx={styles.selectField}
                  value={row.action}
                  onChange={(e) =>
                    handleActionChange(index, e.target.value as MSBActionName)
                  }
                >
                  {Object.values(MSBActionName).map((action) => (
                    <MenuItem key={action} value={action}>
                      {action}
                    </MenuItem>
                  ))}
                </Select>
              </StyledTableCell>

              {/* Properties */}
              <StyledTableCell sx={styles.propertyCell}>
                <ActionPropertiesTable
                  key={index} // ensure each instance has a unique key
                  data={{ action: row.action, ...row.properties }}
                  setData={(updatedProperties: any) =>
                    handlePropertyChange(index, updatedProperties)
                  }
                />
              </StyledTableCell>
            </StyledTableRow>
          ))}
        </TableBody>
      </StyledTable>
      <IconButton onClick={handleAddRow} aria-label="add">
        <AddIcon sx={styles.addIcon} />
      </IconButton>
    </div>
  );
};
 