import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { schemeTableau10 } from "d3-scale-chromatic";
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  SelectChangeEvent,
  Typography,
} from "@mui/material";
import Head from "next/head";

import { TimeSeriesPoint } from "src/types/TimeSeriesPoint";
import { searchPeaks } from "src/utils/feature-action/feature-search";
import { Peak } from "src/utils/feature-action/Peak";
import { sliceTimeseriesByDate } from "src/utils/common";
import { LinePlot, LineProps } from "src/components/plots/LinePlot";
import { Dot } from "src/components/actions/Dot";
import { getCovid19Data } from "src/services/TimeSeriesDataService";

const WIDTH = 1500,
  HEIGHT = 500;

const FeaturesPage = () => {
  const chartRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [locData, setLocData] = useState<Record<string, TimeSeriesPoint[]>>({});
  const [data, setData] = useState<TimeSeriesPoint[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [region, setRegion] = useState<string>("");

  useEffect(() => {
    if (!chartRef.current) return;

    const fetchData = async () => {
      try {
        const data = await getCovid19Data();
        setLocData(data);
        setRegions(Object.keys(data).sort());
        // setRegion("Aberdeenshire");
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };

    fetchData();

    return () => {};
  }, []);

  useEffect(() => {
    if (!region || !locData[region] || !chartRef.current) return;

    const peaks: Peak[] = searchPeaks(data, 1, "cases", 10);

    console.log("TestFeatures: data = ", data);
    console.log("FeaturesPage: peaks = ", peaks);

    const peaksStartEnd = peaks.map((peak) =>
      sliceTimeseriesByDate(data, peak.getStart(), peak.getEnd())
    );
    peaksStartEnd.unshift(data);

    console.log("TestFeatures: peaksData = ", peaksStartEnd);

    d3.select(chartRef.current)
      .append("svg")
      .attr("width", WIDTH)
      .attr("height", HEIGHT)
      .append("g")
      .node();

    // Make sure chartRef.current is not null before using it
    if (chartRef.current) {
      const plot = new LinePlot()
        .setData(peaksStartEnd)
        .setPlotProps({
          xLabel: "Date",
          title: `${region}`,
          leftAxisLabel: "Number of cases",
        })
        .setLineProps(
          peaksStartEnd.map((d, i) => {
            return {
              stroke: schemeTableau10[i],
              strokeWidth: 1.5,
            } as LineProps;
          })
        )
        .setCanvas(chartRef.current)
        .plot();

      peaks.forEach((peak) => {
        console.log(plot.getCoordinates(peak.getDate()));
        // Add null check for chartRef.current
        if (chartRef.current) {
          new Dot()
            .setProps({ color: "#FF5349" })
            .setCanvas(chartRef.current)
            .setCoordinate(plot.getCoordinates(peak.getDate()))
            .show();
        }
      });
    }
  }, [data, region]);

  const handleSelectRegion = (event: SelectChangeEvent) => {
    const region = event.target.value;
    if (region) {
      setRegion(region);
      setData(locData[region]);
    }
  };

  return (
    <>
      <Head>
        <title>Playground | Features</title>
      </Head>

      <Box
        sx={{
          minHeight: "100%",
          py: 8,
        }}
      >
        <Typography variant="h6">Show peaks</Typography>

        <FormControl component="fieldset" variant="standard">
          <InputLabel sx={{ m: 1, width: 300, mt: 0 }} id="select-region-label">
            Select region
          </InputLabel>
          <Select
            sx={{ m: 1, width: 300, mt: 0 }}
            id="select-region-label"
            displayEmpty
            onChange={handleSelectRegion}
            value={region}
            input={<OutlinedInput label="Select region" />}
          >
            {regions.map((d) => (
              <MenuItem key={d} value={d}>
                {d}
              </MenuItem>
            ))}
          </Select>

          <svg
            ref={chartRef}
            style={{
              width: `${WIDTH}px`,
              height: `${HEIGHT}px`,
              border: "1px solid",
            }}
          ></svg>
        </FormControl>
      </Box>
    </>
  );
};

export default FeaturesPage;
