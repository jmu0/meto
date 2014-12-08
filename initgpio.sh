#!/bin/bash

#reset
rm -r /home/jos/gpio
mkdir /home/jos/gpio
echo 65 > /sys/class/gpio/unexport
echo 115 > /sys/class/gpio/unexport

#relay 1
echo 65 > /sys/class/gpio/export
echo out > /sys/class/gpio/gpio65/direction
ln -s /sys/class/gpio/gpio65 /home/jos/gpio/relay1

#relay 2
echo 115 > /sys/class/gpio/export
echo out > /sys/class/gpio/gpio115/direction
ln -s /sys/class/gpio/gpio115 /home/jos/gpio/relay2

sleep 1
#chown jos:users /sys/class/gpio/gpio65
chown jos:users /sys/class/gpio/gpio65/*
#chown jos:users /sys/class/gpio/gpio115
chown jos:users /sys/class/gpio/gpio115/*
chown -R jos:users /home/jos/gpio

